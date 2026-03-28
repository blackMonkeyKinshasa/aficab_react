import { Input } from '@/components/ui/input';
 
export function InputPreview() {
  return (
    <Input
      keyboardType="email-address"
      textContentType="addressCity"
      autoComplete="email"
      placeholder="Email"
    />
  );
}