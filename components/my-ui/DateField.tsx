import React, { useState } from "react";
import { TouchableOpacity, useColorScheme, View } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import { ModuleReservation } from "./ModuleReservation";

type Props = {
  label?: string;
  value?: Date | null;
  departureHour?: number;
  onChange?: (date: Date) => void;
};

export function DateField({
departureHour=8,
  label = "Choisir une date",
  value = null,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(value);
  const [visible, setVisible] = React.useState(false)
  const isDarkMode = useColorScheme() === 'dark';

  const onConfirm = ({ date }: { date: Date | undefined }, ) => {
    setOpen(false);

    if (date) {
      setDate(date);
    }
    setVisible(true);
  
  };
  const onDismiss = React.useCallback(() => {
    setVisible(false)
  }, [setVisible])

  const onConfirmTime = React.useCallback(
  ({ hours, minutes }: { hours: number; minutes: number }) => {
    setVisible(false);

    if (!date) return;

    const newDate = new Date(date);

    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);

    setDate(newDate);
    onChange?.(newDate);

    console.log("Date complète :", newDate);
  },
  [date, onChange]
);

  const formatDate = (d: Date | null) => {
    if (!d) return "";
    return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    });
  };

  return (
    <View >

        <TouchableOpacity  onPress={() => setOpen(true)}>

              <ModuleReservation 
              icon={"calendar-outline"}
              title={value ? formatDate(value) : label}
              isDarkMode={isDarkMode}
              />

        </TouchableOpacity>
      
     
        <TimePickerModal
         visible={visible}
          onDismiss={onDismiss}
          onConfirm={onConfirmTime}
          hours={departureHour}
          minutes={0}
          locale="fr"
          label="Selectionnez une heure"
        /> 
         <DatePickerModal
        locale="fr"
        mode="single"
        visible={open}
        onDismiss={() => setOpen(false)}
        date={date || new Date()}
        presentationStyle="formSheet"
        onConfirm={onConfirm}
      />
     
    </View>
  );
}