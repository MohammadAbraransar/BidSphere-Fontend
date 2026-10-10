export interface AuctionItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  startingPrice: number;
  currentPrice: number;
  endTime: string;
  active: boolean;
}

export interface BidMessage {
  itemId: number;
  bidderName: string;
  currentPrice: number;
  bidTime: string;
  message: string;
}
