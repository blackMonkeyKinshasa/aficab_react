import { TouchableOpacity } from 'react-native';

import { HelpCircle } from 'lucide-react-native';

export function InfoIcon() {
  return (
    <TouchableOpacity>
      <HelpCircle size={16} color="#999999" />
    </TouchableOpacity>
  );
}
