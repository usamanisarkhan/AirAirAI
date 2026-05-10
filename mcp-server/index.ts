import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { z } from "zod";

const app = express();
app.use(cors());
// REMOVED express.json() globally to prevent consuming the stream before the MCP transport gets it

// Mock Flight Data
const FLIGHTS = [
  { id: "AA101", from: "London", to: "New York", price: 450, date: "2026-06-01", time: "10:00 AM", airline: "AirAir" },
  { id: "AA102", from: "London", to: "Dubai", price: 600, date: "2026-06-02", time: "09:30 PM", airline: "AirAir" },
  { id: "AA103", from: "Paris", to: "Tokyo", price: 850, date: "2026-06-05", time: "11:15 AM", airline: "AirAir" },
  { id: "AA104", from: "New York", to: "London", price: 480, date: "2026-06-10", time: "08:00 PM", airline: "AirAir" },
  { id: "AA105", from: "Dubai", to: "London", price: 550, date: "2026-06-12", time: "07:45 AM", airline: "AirAir" },
];

function createMcpServer() {
  const server = new Server(
    { name: "air-air-mcp-server", version: "1.0.4" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(z.object({ method: z.literal("tools/list") }), async () => ({
    tools: [
      {
        name: "search_flights",
        description: "Search for available flights",
        inputSchema: {
          type: "object",
          properties: { from: { type: "string" }, to: { type: "string" } },
          required: ["from", "to"]
        }
      },
      {
        name: "book_flight",
        description: "Book a flight",
        inputSchema: {
          type: "object",
          properties: {
            flightId: { type: "string" },
            passengerName: { type: "string" },
            email: { type: "string" }
          },
          required: ["flightId", "passengerName", "email"]
        }
      }
    ]
  }));

  server.setRequestHandler(
    z.object({ method: z.literal("tools/call"), params: z.object({ name: z.string(), arguments: z.record(z.any()) }) }),
    async (request) => {
      const { name, arguments: args } = request.params;
      if (name === "search_flights") {
        const results = FLIGHTS.filter(f => 
          f.from.toLowerCase().includes(args.from.toLowerCase()) && 
          f.to.toLowerCase().includes(args.to.toLowerCase())
        );
        return { content: [{ type: "text", text: JSON.stringify(results) }] };
      }
      if (name === "book_flight") {
        const bookingId = `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        return { content: [{ type: "text", text: `Booking confirmed! ID: ${bookingId}. Ticket sent to ${args.email}.` }] };
      }
      throw new Error("Tool not found");
    }
  );

  return server;
}

const activeSessions = new Map<string, { server: Server, transport: SSEServerTransport }>();

app.get("/sse", async (req, res) => {
  console.log("New SSE Connection");
  const transport = new SSEServerTransport("/messages", res);
  const server = createMcpServer();
  await server.connect(transport);
  
  const sessionId = transport.sessionId;
  if (sessionId) {
    activeSessions.set(sessionId, { server, transport });
    req.on("close", async () => {
      activeSessions.delete(sessionId);
      await server.close();
    });
  }
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = activeSessions.get(sessionId);
  if (!session) return res.status(404).send("Session not found");
  
  // SSEServerTransport.handlePostMessage will read from req stream directly
  await session.transport.handlePostMessage(req, res);
});

app.listen(3001, () => {
  console.log("MCP Server running on port 3001 (No global JSON parser)");
});
