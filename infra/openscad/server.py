import json
import subprocess
import tempfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class OpenScadHandler(BaseHTTPRequestHandler):
    def _send(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send(HTTPStatus.OK, {"status": "ok"})
            return
        self._send(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/compile":
            self._send(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            source = payload["source"]
            if not isinstance(source, str) or not source.strip():
                raise ValueError("source must be a non-empty string")
        except (KeyError, ValueError, json.JSONDecodeError) as error:
            self._send(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return

        with tempfile.TemporaryDirectory() as directory:
            workdir = Path(directory)
            source_file = workdir / "model.scad"
            output_file = workdir / "model.stl"
            source_file.write_text(source, encoding="utf-8")
            result = subprocess.run(
                ["openscad", "-o", str(output_file), str(source_file)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0 or not output_file.exists():
                self._send(HTTPStatus.UNPROCESSABLE_ENTITY, {"error": result.stderr.strip()})
                return
            self._send(HTTPStatus.OK, {"stl": output_file.read_text(encoding="utf-8")})


ThreadingHTTPServer(("0.0.0.0", 8080), OpenScadHandler).serve_forever()
