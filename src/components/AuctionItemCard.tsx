import React, { useState, useEffect } from 'react';
import type { AuctionItem } from '../types';
import './AuctionItemCard.css';
import { Gavel, Clock, ArrowUpCircle } from 'lucide-react';

interface Props {
  item: AuctionItem;
  onPlaceBid: (itemId: number, amount: number) => void;
  lastBidMessage?: string;
  isBidding: boolean;
}

export const AuctionItemCard: React.FC<Props> = ({ item, onPlaceBid, lastBidMessage, isBidding }) => {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [flash, setFlash] = useState(false);

  // Countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(item.endTime).getTime() - new Date().getTime();
      
      if (difference <= 0) return "Auction Ended";
      
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      return `${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [item.endTime]);

  // Flash effect when price updates
  useEffect(() => {
    setFlash(true);
    const timeout = setTimeout(() => setFlash(false), 1000);
    return () => clearTimeout(timeout);
  }, [item.currentPrice]);

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(bidAmount);
    if (!isNaN(amount) && amount > item.currentPrice) {
      onPlaceBid(item.id, amount);
      setBidAmount('');
    }
  };

  const minBid = item.currentPrice + 10;

  return (
    <div className={`auction-card glass-panel animate-fade-in ${flash ? 'flash-update' : ''}`}>
      <div className="card-image-container">
        <img src={item.imageUrl || "https://images.unsplash.com/photo-1523170335258-f5ed11844a49"} alt={item.title} className="card-image" />
        <div className="badge time-badge">
          <Clock size={14} />
          <span>{timeLeft}</span>
        </div>
        {!item.active && <div className="badge closed-badge">CLOSED</div>}
      </div>
      
      <div className="card-content">
        <h3 className="card-title">{item.title}</h3>
        <p className="card-description">{item.description}</p>
        
        <div className="price-container">
          <div className="price-label">Current Bid</div>
          <div className="price-value text-gradient">${item.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>

        {lastBidMessage && (
          <div className="bid-notification">
            <span className="notification-dot"></span>
            {lastBidMessage}
          </div>
        )}

        <form onSubmit={handleBidSubmit} className="bid-form">
          <div className="input-group">
            <span className="currency-symbol">$</span>
            <input 
              type="number" 
              className="input-field bid-input"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Min: $${minBid.toFixed(2)}`}
              min={minBid}
              step="0.01"
              disabled={!item.active || isBidding}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!item.active || isBidding || (parseFloat(bidAmount) <= item.currentPrice)}
          >
            <ArrowUpCircle size={18} />
            {isBidding ? 'Placing...' : 'Place Bid'}
          </button>
        </form>
      </div>
    </div>
  );
};
