// UI Component Types
export type ChipOption<T = string | number> = {
  label: string;
  value: T;
};

export interface AppTextProps {
  children: React.ReactNode;
  style?: any;
  [key: string]: any;
}

export interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
  width?: number;
  height?: number;
}

export type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  [key: string]: any;
};

export type AppInputProps = {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  [key: string]: any;
};

