# AirAirAI Architecture Diagram

The application follows the **Model Context Protocol (MCP)** architecture, enabling a decoupled interaction between the AI-powered interface and the flight booking logic.

![Architecture Diagram](architecture.png)

## High-Level Architecture

```mermaid
graph TD
    subgraph "Frontend (Client)"
        UI[React UI]
        Agent[Agentic Logic]
        MCPClient[MCP Client SDK]
        UI --> Agent
        Agent --> MCPClient
    </div>

    subgraph "Backend (MCP Server)"
        MCPServer[MCP Server SDK]
        Tools[Flight Tools]
        DB[(Mock Flight DB)]
        Email[Email Service]
        MCPServer --> Tools
        Tools --> DB
        Tools --> Email
    </div>

    MCPClient <== "SSE (Server-Sent Events)" ==> MCPServer
    MCPClient -- "Tool Call (JSON-RPC)" --> MCPServer
    MCPServer -- "Tool Result" --> MCPClient
```

## Component Breakdown

1.  **React UI**: A chat-first interface using `lucide-react` for iconography and `Outfit`/`Inter` typography.
2.  **MCP Client**: Manages the connection to the server and handles tool execution requests.
3.  **SSE Transport**: Enables real-time, bi-directional-like communication over standard HTTP.
4.  **MCP Server**: A session-aware server that instantiates isolated logic per connection.
5.  **Flight Tools**:
    *   `search_flights`: Filters the mock database.
    *   `book_flight`: Records booking and triggers the email service.
    *   `send_ticket_email`: Simulates sending a ticket via `nodemailer`.
