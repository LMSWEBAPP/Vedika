import http.server
import socketserver

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Database is initializing. Please refresh in a few minutes.")
        
    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()

# Allow immediate rebinding to the port after shutdown
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("Serving dummy server on port", PORT)
    httpd.serve_forever()
