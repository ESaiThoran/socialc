declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  export type LucideIcon = ComponentType<LucideProps>;
  
  export const Bell: LucideIcon;
  export const Home: LucideIcon;
  export const Mail: LucideIcon;
  export const Search: LucideIcon;
  export const Share2: LucideIcon;
  export const User: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const Video: LucideIcon;
  export const PlusSquare: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Loader2: LucideIcon;
  export const Heart: LucideIcon;
  export const UserPlus: LucideIcon;
  export const AtSign: LucideIcon;
  export const Image: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Smile: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const Repeat2: LucideIcon;
  export const Bookmark: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const Send: LucideIcon;
  export const X: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const MapPin: LucideIcon;
  export const Link: LucideIcon;
  export const Users: LucideIcon;
  export const Zap: LucideIcon;
}