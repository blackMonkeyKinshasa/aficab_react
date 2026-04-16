import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  useColorScheme,
} from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import { PaymentMethod } from "@/constants/dataInterface";



interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PaymentModal({ visible, onClose }: Props) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const isDark = useColorScheme() === 'dark';
  const containerBg = isDark ? '#1E2226' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#A0A0A0' : '#555555';
  const cardBg = isDark ? '#2a2f35' : '#ffffff';
  const cardBorder = isDark ? '#374151' : '#dddddd';
  const inputBorder = isDark ? '#374151' : '#dddddd';
  const inputBg = isDark ? '#111827' : '#ffffff';
  const inputText = isDark ? '#ffffff' : '#000000';
  const handleIndicatorColor = isDark ? '#6b7280' : '#d1d5db';
  const snapPoints = useMemo(() => ['60%'], []);

  const [selected, setSelected] = useState<PaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const showPhoneField = selected !== "cash" && selected !== "card";
  const paymentLabel = selected === "mpesa"
    ? "Mpesa"
    : selected === "orange"
      ? "Orange Money"
      : "Airtel Money";

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
      return;
    }

    bottomSheetModalRef.current?.dismiss();
  }, [visible]);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.4}
      pressBehavior="close"
    />
  );

  const PaymentCard = ({
    type,
    label,
    logo,
  }: {
    type: PaymentMethod;
    label: string;
    logo: any;
  }) => {
    const isActive = selected === type;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: isActive ? (isDark ? '#1a3a25' : '#e8f5ec') : cardBg, borderColor: isActive ? '#04a24c' : cardBorder }]}
        onPress={() => setSelected(type)}
      >
        <View style={styles.check}>
          {isActive && <View style={styles.innerCheck} />}
        </View>

        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.cardText, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onDismiss={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: containerBg }}
      handleIndicatorStyle={{ backgroundColor: handleIndicatorColor }}
    >
      <BottomSheetView style={[styles.container, { backgroundColor: containerBg }]}> 
          <Text style={[styles.title, { color: textColor }]}>
            Comment souhaitez-vous payer ?
          </Text>

          <View style={styles.grid}>
            <PaymentCard
              type="mpesa"
              label="M-pesa"
              logo={require("@/assets/money/mpesa.png")}
            />
            <PaymentCard
              type="orange"
              label="Orange Money"
              logo={require("@/assets/money/orange.png")}
            />
            <PaymentCard
              type="airtel"
              label="Airtel Money"
              logo={require("@/assets/money/airtel.png")}
            />
            <PaymentCard
              type="card"
              label="Carte de crédit"
              logo={require("@/assets/money/visa.png")}
            />

            <PaymentCard
              type="cash"
              label="Espèces"
              logo={require("@/assets/money/cash.png")}
            />
          </View>

          {showPhoneField && (
            <>
              <Text style={[styles.label, { color: subTextColor }]}>
                Informations de paiement ({paymentLabel}) :
              </Text>

              <TextInput
                placeholder="Saisissez le numéro de téléphone"
                placeholderTextColor={subTextColor}
                value={phone}
                onChangeText={setPhone}
                style={[styles.input, { borderColor: inputBorder, backgroundColor: inputBg, color: inputText }]}
                keyboardType="phone-pad"
              />
            </>
          )}

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Payer</Text>
          </TouchableOpacity>

          
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  check: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#aaa",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#04a24c",
  },
  logo: {
    width: 50,
    height: 30,
    marginVertical: 5,
  },
  cardText: {
    fontSize: 13,
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#ff6600",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  close: {
    textAlign: "center",
    marginTop: 10,
    color: "#888",
  },
});