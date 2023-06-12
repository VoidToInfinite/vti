import { IImage } from "@/types/Image.types";

interface ICard {
  image?: IImage;
  cardTitleType?: "h3" | "h4" | "h5" | "h6";
  cardTitle: string;
  cardText: string;
  cardSubtitle?: string;
  isExpanded?: boolean;
  showButtons?: boolean;
}

export default ICard;
