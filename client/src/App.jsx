import React, { useState, useEffect, useRef } from 'react';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Plane, Send, CheckCircle, Bot, User, Loader2, Mail, Info } from 'lucide-react';

function App() {
  const [mcpClient, setMcpClient] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Hello! I'm your AirAir agentic assistant. I can help you search, book, and receive your flight tickets via email. Where would you like to fly today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentBooking, setCurrentBooking] = useState({ flight: null, email: null });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const transport = new SSEClientTransport(new URL("http://localhost:3001/sse"));
    const client = new Client({ name: "air-air-agent", version: "1.0.2" }, { capabilities: {} });
    const connect = async () => {
      try {
        await client.connect(transport);
        setMcpClient(client);
      } catch (e) {
        console.error("MCP Connection failed", e);
        addMessage('agent', "I'm having trouble connecting to my systems. Please ensure the MCP server is running.");
      }
    };
    connect();
    return () => client.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const addMessage = (role, content, type = 'text', data = null) => {
    setMessages(prev => [...prev, { role, content, type, data }]);
  };

  const processAgentResponse = async (userMsg) => {
    if (!mcpClient) return;
    setIsTyping(true);

    try {
      // 1. Check for search intent
      if (userMsg.toLowerCase().includes('search') || userMsg.toLowerCase().includes('to') || userMsg.toLowerCase().includes('flights')) {
        const to = userMsg.match(/to\s+([a-zA-Z\s]+)/i)?.[1]?.trim() || 'Dubai';
        const from = userMsg.match(/from\s+([a-zA-Z\s]+)/i)?.[1]?.trim() || 'London';
        
        const response = await mcpClient.callTool({
          name: "search_flights",
          arguments: { from, to }
        });
        const results = JSON.parse(response.content[0].text);
        
        if (results.length > 0) {
          addMessage('agent', `I found ${results.length} flights for you from ${from} to ${to}. Please select one to proceed:`, 'flight_list', results);
        } else {
          addMessage('agent', `I couldn't find any flights from ${from} to ${to}. Would you like to try a different destination?`);
        }
      } 
      // 2. Check for email/booking finalization
      else if (userMsg.includes('@') && currentBooking.flight) {
        const email = userMsg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
        if (email) {
          const response = await mcpClient.callTool({
            name: "book_flight",
            arguments: { 
              flightId: currentBooking.flight.id, 
              passengerName: "Usama Nisar", 
              email: email 
            }
          });
          addMessage('agent', response.content[0].text, 'success');
          setCurrentBooking({ flight: null, email: null });
        }
      }
      // 3. Fallback
      else {
        addMessage('agent', "I can help you search for flights or book a flight. Try saying 'Flights from London to Paris' or provide your email if you're ready to book.");
      }
    } catch (error) {
      addMessage('agent', "Something went wrong while processing your request. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const msg = input;
    addMessage('user', msg);
    setInput('');
    processAgentResponse(msg);
  };

  const handleFlightSelect = (flight) => {
    setCurrentBooking(prev => ({ ...prev, flight }));
    addMessage('user', `I'll book flight ${flight.id}`);
    setIsTyping(true);
    setTimeout(() => {
      addMessage('agent', `Great choice! To finalize booking ${flight.id} to ${flight.to}, please provide your email address for the ticket.`);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="sidebar-header">
          <Plane className="logo-icon" />
          <h2>AirAir</h2>
        </div>
        <div className="booking-widget">
          <h3>Active Booking</h3>
          {currentBooking.flight ? (
            <div className="active-card">
              <div className="row"><span>ID:</span> <strong>{currentBooking.flight.id}</strong></div>
              <div className="row"><span>Route:</span> <strong>{currentBooking.flight.from} - {currentBooking.flight.to}</strong></div>
              <div className="row"><span>Price:</span> <strong>${currentBooking.flight.price}</strong></div>
              <div className="status-badge">Awaiting Email</div>
            </div>
          ) : (
            <p className="placeholder">Start a search to begin booking.</p>
          )}
        </div>
      </div>

      <div className="main-chat">
        <div className="chat-header">
          <div className="agent-info">
            <Bot className="bot-icon" />
            <div>
              <h4>AirAir Assistant</h4>
              <span className="status">Agentic Mode Active</span>
            </div>
          </div>
        </div>

        <div className="messages-area">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className="message-content">
                <div className="bubble">
                  {m.content}
                  {m.type === 'flight_list' && (
                    <div className="flight-results">
                      {m.data.map(f => (
                        <div key={f.id} className="flight-item" onClick={() => handleFlightSelect(f)}>
                          <div className="f-main">
                            <strong>{f.id}</strong>
                            <span>${f.price}</span>
                          </div>
                          <div className="f-sub">{f.from} → {f.to}</div>
                          <div className="f-meta">{f.time} | {f.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.type === 'success' && (
                    <div className="success-banner">
                      <CheckCircle size={18} />
                      Ticket Emailed!
                    </div>
                  )}
                </div>
                <div className="sender-tag">{m.role === 'agent' ? 'Assistant' : 'You'}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message-row agent">
              <div className="message-content">
                <div className="bubble typing">
                  <Loader2 className="animate-spin" size={16} />
                  Agent is thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSend}>
          <input 
            placeholder="Type your message (e.g., 'Flights to Dubai')..." 
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
