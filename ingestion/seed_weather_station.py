#!/usr/bin/env python3
"""Seed 50 cited ESP32/BME280 chunks through A4's temporary direct-DB fallback.

TODO(reconcile A4): replace these generic chunks with C2's approved golden StepPlan
claims, then route the seed through POST /api/ingest/v1/upsert in A5.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import urllib.error
import urllib.request
import uuid


SOURCES = [
    ("esp32-datasheet", "ESP32 Series Datasheet", "https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf", "ESP32 electrical characteristics", [
        "Use the ESP32 board's regulated 3.3 V rail for 3.3 V peripherals.",
        "Confirm a development board's pin labels before wiring a peripheral.",
        "Keep power and ground connections explicit in every wiring step.",
        "Use a common ground when two low-voltage modules communicate.",
        "Disconnect power before changing breadboard wiring.",
    ]),
    ("esp-idf-i2c", "ESP-IDF I2C API Reference", "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2c.html", "I2C Introduction", [
        "I2C uses SDA for data and SCL for clock.",
        "I2C devices share a bus while using addresses to distinguish devices.",
        "A wiring check should identify both SDA and SCL before software setup.",
        "Keep I2C wiring short and inspect loose jumpers before debugging code.",
        "A sensor cannot communicate until power, ground, SDA, and SCL are all connected.",
    ]),
    ("bme280-datasheet", "BME280 Datasheet", "https://cdn-shop.adafruit.com/datasheets/BST-BME280_DS001-10.pdf", "Electrical and communication interfaces", [
        "The BME280 measures temperature, pressure, and humidity.",
        "A BME280 breakout must be configured for the interface it exposes.",
        "Verify the breakout board's voltage requirements before applying power.",
        "Sensor readings should be checked for plausible values after wiring.",
        "Use the datasheet as the authority for a specific BME280 board's pins.",
    ]),
    ("adafruit-bme280", "Adafruit BME280 Guide", "https://learn.adafruit.com/adafruit-bme280-humidity-barometric-pressure-temperature-sensor-breakout", "Wiring", [
        "Breakout-board labels are the primary reference when connecting a BME280.",
        "Match the BME280 data lines to the selected ESP32 I2C pins.",
        "Do not reverse VCC and GND connections.",
        "Breadboard rows are electrically connected only along their intended strip.",
        "A visual wiring review catches misplaced jumpers before power-on.",
    ]),
    ("sparkfun-bme280", "SparkFun BME280 Hookup Guide", "https://learn.sparkfun.com/tutorials/qwiic-atmospheric-sensor-bme280-hookup-guide", "Hardware overview", [
        "A sensor module needs both a power path and a data path.",
        "Use the guide for the breakout board actually present in the build.",
        "I2C cabling should preserve the SDA-to-SDA and SCL-to-SCL mapping.",
        "Record the selected pin mapping in the project notes.",
        "Test one subsystem at a time when initial readings fail.",
    ]),
    ("esp32-gpio", "ESP32 GPIO Documentation", "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/gpio.html", "GPIO", [
        "GPIO assignments belong in the build plan, not only in source code.",
        "Avoid changing a pin assignment without updating the wiring record.",
        "Use clearly labeled jumper wires to make signal tracing easier.",
        "Check for shared-pin conflicts before adding another peripheral.",
        "A breadboard prototype benefits from a deliberate power-rail plan.",
    ]),
    ("arduino-i2c", "Arduino I2C Reference", "https://docs.arduino.cc/learn/communication/wire/", "Wire library overview", [
        "I2C communication requires a compatible device address.",
        "An I2C scanner can help diagnose a connected but unresponsive device.",
        "Do not treat a missing I2C device as proof that the sensor is damaged.",
        "Check wiring and power before changing application logic.",
        "Preserve source citations when explaining an I2C troubleshooting step.",
    ]),
    ("ifx-soldering", "iFixit Soldering Basics", "https://www.ifixit.com/Guide/How+To+Solder+and+Desolder+Connections/750", "Soldering safety", [
        "Work in a ventilated area when soldering.",
        "Allow a soldering iron to cool before storage.",
        "Keep flammable materials away from a hot soldering iron.",
        "Inspect a solder joint for unintended bridges before applying power.",
        "Wear appropriate eye protection when cutting leads or soldering.",
    ]),
    ("esd", "SparkFun ESD Safety", "https://learn.sparkfun.com/tutorials/pcb-basics/all", "Static electricity", [
        "Handle electronics by their edges when practical.",
        "Use a static-safe workspace when handling sensitive components.",
        "Keep loose conductive objects away from powered circuits.",
        "Power should remain off while rearranging a breadboard.",
        "Organize components so their labels remain visible during assembly.",
    ]),
    ("breadboard", "SparkFun Breadboard Basics", "https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard/all", "Breadboard layout", [
        "Breadboard rail continuity should be checked before using it for power.",
        "Keep the ESP32 and sensor oriented so their labels are readable.",
        "Use separate wire colors for power, ground, SDA, and SCL when available.",
        "A connection map should match the physical layout before the first test.",
        "Remove power before moving a jumper to a new breadboard row.",
    ]),
]


def corpus() -> list[dict[str, object]]:
    chunks: list[dict[str, object]] = []
    for source_id, title, source_url, locator, claims in SOURCES:
        for index, claim in enumerate(claims, start=1):
            chunks.append({
                "externalId": f"{source_id}-{index}",
                "sourceId": source_id,
                "sourceUrl": source_url,
                "title": title,
                "content": claim,
                "citation": {"sourceUrl": source_url, "locator": locator, "title": title},
            })
    assert len(chunks) == 50
    return chunks


def escape(value: str) -> str:
    return value.replace("'", "''")


def embedding(content: str, ollama_url: str) -> list[float]:
    if ollama_url == "docker":
        result = subprocess.run(
            ["docker", "compose", "-f", "infra/docker-compose.yml", "exec", "-T", "ollama", "ollama", "run", "nomic-embed-text", content],
            capture_output=True, text=True, check=True,
        )
        values = json.loads(result.stdout)
        if len(values) != 768:
            raise ValueError(f"Expected a 768-value embedding, got {len(values)}")
        return values

    def request(path: str, payload: dict[str, str]) -> dict[str, object]:
        call = urllib.request.Request(
            f"{ollama_url.rstrip('/')}{path}", data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(call, timeout=60) as response:
            return json.loads(response.read())

    try:
        values = request("/api/embed", {"model": "nomic-embed-text", "input": content})["embeddings"][0]
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        values = request("/api/embeddings", {"model": "nomic-embed-text", "prompt": content})["embedding"]
    if len(values) != 768:
        raise ValueError(f"Expected a 768-value embedding, got {len(values)}")
    return values


def seed(chunks: list[dict[str, object]], ollama_url: str) -> None:
    statements = ["BEGIN;"]
    for chunk in chunks:
        content = str(chunk["content"])
        vector = ",".join(str(value) for value in embedding(content, ollama_url))
        row_id = uuid.uuid5(uuid.NAMESPACE_URL, str(chunk["externalId"]))
        citation = json.dumps(chunk["citation"])
        statements.append(
            "INSERT INTO embeddings (id, source_id, content, citation, embedding) VALUES "
            f"('{row_id}', '{escape(str(chunk['sourceId']))}', '{escape(content)}', "
            f"'{escape(citation)}'::jsonb, '[{vector}]'::vector) "
            "ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, citation = EXCLUDED.citation, embedding = EXCLUDED.embedding;"
        )
    statements.append("COMMIT;")
    subprocess.run(
        ["docker", "compose", "-f", "infra/docker-compose.yml", "exec", "-T", "postgres", "psql", "-U", "hardware_builder", "-d", "hardware_builder", "-v", "ON_ERROR_STOP=1"],
        input="\n".join(statements), text=True, check=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ollama-url", default=os.getenv("OLLAMA_URL", "docker"))
    args = parser.parse_args()
    chunks = corpus()
    if args.dry_run:
        print(json.dumps({"chunks": len(chunks), "citations": len(chunks), "idempotency": "uuid5 external IDs"}))
    else:
        seed(chunks, args.ollama_url)
        print(f"Upserted {len(chunks)} cited chunks.")
