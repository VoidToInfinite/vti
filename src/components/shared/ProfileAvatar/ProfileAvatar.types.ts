import { AppGlobalProps } from "@/global/AppGlobal.types";

interface IProfileAvatar extends AppGlobalProps {
  src?: string;
  name: string;
  hasBadge?: boolean;
  isActive?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
}

export default IProfileAvatar;
