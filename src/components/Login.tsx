import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (token: string, username: string, role: string) => void;
}

const API_AUTH_URL = 'http://localhost:8081/api/auth';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickFill = (presetUser: string, presetPass: string) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setMessage('');
    setIsError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setLoading(true);

    try {
      if (isRegister) {
        await axios.post(`${API_AUTH_URL}/register`, { 
          username: username.trim(), 
          password, 
          email: email.trim(), 
          phoneNumber: phoneNumber.trim() 
        });
        setIsRegister(false);
        setIsError(false);
        setMessage('Registration successful! Please log in.');
      } else {
        const response = await axios.post(`${API_AUTH_URL}/login`, { 
          username: username.trim(), 
          password 
        });
        onLoginSuccess(response.data.token, response.data.username, response.data.role);
      }
    } catch (err: any) {
      setIsError(true);
      const errData = err.response?.data;
      if (typeof errData === 'object' && errData !== null) {
        const errors = Object.values(errData).join(', ');
        setMessage(errors || 'Validation failed. Please check your inputs.');
      } else {
        setMessage(errData || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="icon-wrapper text-gradient">
            {isRegister ? <UserPlus size={40} color="var(--accent-primary)" /> : <LogIn size={40} color="var(--accent-primary)" />}
          </div>
          <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="subtitle">{isRegister ? 'Dynamic role assignment based on username' : 'Sign in to access your platform role'}</p>
        </div>

        {/* Quick Role Pipeline Info / Chips */}
        <div className="role-pipeline-banner">
          <div className="pipeline-title">⚡ Smart Role Pipeline</div>
          <div className="pipeline-chips">
            <button 
              type="button" 
              className="pipeline-chip user-chip"
              onClick={() => handleQuickFill('demo.user', 'user123')}
              title="Use *.user for Bidder role"
            >
              <span>👤 .user</span>
              <small>Bidder</small>
            </button>
            <button 
              type="button" 
              className="pipeline-chip maker-chip"
              onClick={() => handleQuickFill('demo.auction', 'maker123')}
              title="Use *.auction or *.maker for Auction Maker"
            >
              <span>🔨 .auction</span>
              <small>Maker</small>
            </button>
            <button 
              type="button" 
              className="pipeline-chip admin-chip"
              onClick={() => handleQuickFill('demo.admin', 'admin123')}
              title="Use *.admin for Admin role"
            >
              <span>👑 .admin</span>
              <small>Admin</small>
            </button>
          </div>
          <p className="pipeline-hint">
            Type any username with <code>.user</code>, <code>.auction</code>, or <code>.admin</code> to auto-route instantly!
          </p>
        </div>

        {message && (
          <div className={`alert ${isError ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. name.user, name.auction, or name.admin"
              required 
            />
          </div>
          
          {isRegister && (
            <>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  required 
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required 
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="loader"></span> : (isRegister ? 'Sign Up with Auto-Role' : 'Sign In')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              className="toggle-mode-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage('');
                setIsError(false);
              }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
