# Build Brief: USB-powered Arduino UNO R3 Built-in Blink

## Decision

The second authored beginner build is a **USB-powered Arduino UNO R3 built-in
Blink** exercise. A learner connects an original Arduino UNO R3 to a computer
with a USB Type-A-to-Type-B *data* cable, uploads Arduino's official Blink
example, and observes the board's built-in `L` indicator change state. The UNO
R3 is a suitable first board because Arduino identifies it as a beginner board,
documents its USB connection, and supplies its official board documentation,
datasheet, schematics, and CAD files from one product page.

This is intentionally a board-and-cable assembly. It introduces physical
orientation, computer-to-board programming, digital output, and time delay
without asking a beginner to select an unverified resistor, wire an external
circuit, solder, use a battery, or handle mains equipment.

## Learner outcome

After completing the path, the learner can:

1. identify the UNO R3's USB-B programming/power connector and a suitable data
   cable;
2. select the UNO R3 and its connected port in the Arduino development
   environment;
3. run the official Blink example and use the `L` indicator as an observable
   output; and
4. explain that changing an output state and waiting changes the visible blink
   pattern.

## Approved parts and limits

| Part | Quantity | Approved use | Source and locator |
| --- | ---: | --- | --- |
| Original Arduino UNO R3 | 1 | Use as purchased; use its built-in `L` indicator only. | [Arduino UNO R3](https://docs.arduino.cc/hardware/uno-rev3/), **Features** and **Downloadable resources**; [UNO R3 Datasheet](https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf), §4.1 *Getting Started – IDE*, p. 8. |
| USB Type-A-to-Type-B data cable | 1 | Connect the computer and UNO R3; the UNO datasheet identifies a USB-B cable for programming and board power. | [UNO R3 Datasheet](https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf), §4.1 *Getting Started – IDE*, p. 8. |
| Computer with a USB port and Arduino development environment | 1 | Select the connected UNO R3, open the shipped example, and upload it. | [Arduino Built-in Examples](https://docs.arduino.cc/built-in-examples), **Basics → Blink**. |

No breadboard, loose wires, LEDs, resistors, motors, sensors, batteries, wall
adapters, chargers, or soldering tools are approved for this build.

## Ordered path and safety treatment

The future fixture must make the safety callout render before the instruction
and carry the category shown below. `none` means no classified build hazard is
introduced; it does not waive normal supervision or the hard exclusions.

| Order | Step | Safety category | Hazard control before instruction |
| ---: | --- | --- | --- |
| 1 | Review the UNO R3, USB data cable, and computer. | `none` | Confirm the board is intact and dry; do not use a damaged cable or exposed electronics. |
| 2 | Inspect the USB-B port and cable ends. | `mechanical` | Align the connector by its shape and use gentle force; do not force, bend, or pry the connector. |
| 3 | Connect the USB cable between the computer and UNO R3. | `none` | Use only the computer's USB connection described in the UNO R3 documentation; do not connect the barrel jack or any external supply. |
| 4 | Select the UNO R3 and connected port, then open the official Blink example. | `none` | Verify the selected board and port before upload; do not alter board wiring or power settings. |
| 5 | Upload Blink and observe the built-in `L` indicator. | `none` | Keep the board on a dry, non-conductive work surface and do not touch or modify exposed circuitry while it is powered. |
| 6 | Change the example's delay only after the default sketch works, then upload and observe the changed pattern. | `none` | Change only the documented example value; do not add external components or unreviewed code that drives pins. |
| 7 | Disconnect the USB cable by its connector after the observation. | `mechanical` | Grip the connector housing, not the cable; stop if the connector binds or is damaged. |

## Required checkpoints

The authored fixture must use server-enforced checkpoints, at minimum:

1. **Connection purpose:** the USB-B data cable both provides the documented
   board connection/power path and permits programming from the computer.
2. **Observed behavior:** the built-in `L` indicator is the output the learner
   observes; changing the sketch delay changes the time between output changes.

## Primary instructional sources

| Source | Primary claim used | Locator |
| --- | --- | --- |
| [Arduino® UNO R3 Datasheet](https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf) | A USB-B cable is used to connect/program the UNO R3 and provides board power; sample sketches are available through the IDE Examples menu or Arduino documentation. | §4.1 *Getting Started – IDE* and §4.3 *Sample Sketches*, p. 8. |
| [Arduino UNO R3](https://docs.arduino.cc/hardware/uno-rev3/) | The official product documentation identifies the UNO R3 as a beginner board and publishes its datasheet, schematics, and CAD files. | **Features** and **Downloadable resources**. |
| [Arduino Built-in Examples: Blink](https://docs.arduino.cc/built-in-examples/basics/Blink/) | Blink is the official beginner example selected by this path. | **Basics → Blink**. |

## CAD, source, and license requirements

The build has no custom template and therefore no new OpenSCAD shape. Its later
assembly view is limited to an UNO R3 board and a USB cable connected through
symbolic, named connector features; the deterministic solver alone will create
the transform. No raw coordinates or transform matrices may appear in model
input or authored lessons.

Before any UNO R3 CAD asset is seeded or shipped, the implementation must:

1. use Arduino's official UNO R3 **CAD Files** download as the source record,
   linked from the [UNO R3 product page](https://docs.arduino.cc/hardware/uno-rev3/);
2. retain its exact bundled Creative Commons license, attribution, and any
   ShareAlike obligations in the `CadAssetRecord`; and
3. reject the asset if the downloaded source does not state a redistributable
   license. Arduino states that its board plans are published under a Creative
   Commons license in its [introduction and licensing guidance](https://www.arduino.cc/en/Guide/Introduction).

The official Blink source remains linked as instructional provenance. It is not
copied into this repository by T001. If a later task vendors example code, it
must record the source-file license before doing so. Repository-authored
symbolic fixture metadata remains under this repository's existing license and
must cite the UNO source above; it is not a substitute for recording the source
and license of any redistributable CAD mesh.

## Explicit exclusions and hard blocks

- No mains AC connection, wall adapter, barrel-jack supply, or power supply
  modification is permitted. Any request for one is a `mains_ac` hard block.
- No LiPo battery, charging circuit, battery pack, or USB power-bank path is
  permitted. Any request for one is a `lipo` hard block.
- No soldering, cutting, drilling, enclosure fabrication, custom PCB, motor,
  high-current load, loose external LED, resistor, breadboard wiring, or
  unverified component substitution is in scope.
- The learner must use an original UNO R3 or a verified electrically equivalent
  board only after its inventory, source URL, and license metadata pass the
  shared schema and review. A charging-only USB cable is not an acceptable
  substitute.
- The build supports the existing five-tab Workshop UI only. It adds no cloud
  service, authentication flow, sixth tab, free-form project generation, or
  model-owned spatial/electrical decisions.

## T020 decision

**Custom template: not required.** The approved assembly contains no printed or
machined part. A later solver trace may attach the verified cable's named device
connector to the UNO R3's named USB-B connector, but a template request would
add unsupported geometry without a learner need.

## T002 validation record

### Selected identifier and reserved stable UUIDs

The selected build slug is **`uno-usb-blink`**. These values are reserved now
and must be used unchanged by the later registry, fixture, tests, seed data,
and symbolic assembly records.

| Record | Stable UUID |
| --- | --- |
| Authored build manifest | `70000000-0000-4000-8000-000000000001` |
| UNO R3 catalog part and CAD asset | `71000000-0000-4000-8000-000000000001` |
| USB data-cable catalog part and CAD asset | `71000000-0000-4000-8000-000000000002` |
| Step 1: review parts | `72000000-0000-4000-8000-000000000001` |
| Step 2: inspect USB-B connector | `72000000-0000-4000-8000-000000000002` |
| Step 3: connect USB cable | `72000000-0000-4000-8000-000000000003` |
| Step 4: select board and open Blink | `72000000-0000-4000-8000-000000000004` |
| Step 5: upload and observe Blink | `72000000-0000-4000-8000-000000000005` |
| Step 6: change delay and observe | `72000000-0000-4000-8000-000000000006` |
| Step 7: disconnect cable | `72000000-0000-4000-8000-000000000007` |
| Checkpoint: USB purpose | `73000000-0000-4000-8000-000000000001` |
| Checkpoint: observed output | `73000000-0000-4000-8000-000000000002` |

### Acceptance evidence against the feature specification

| Specification requirement | Brief evidence | Status |
| --- | --- | --- |
| Low-voltage beginner project; no mains AC, LiPo charging, or unverified hazards | The approved-parts list is limited to the UNO R3, its USB data cable, and a computer. The explicit exclusions hard-block mains AC and LiPo paths, and the ordered path assigns a safety category and prior control to all seven steps. | Pass |
| Purpose, intended learner, approved parts, per-step safety, sources and locators | The Decision, Learner outcome, Approved parts, Ordered path, and Primary instructional sources sections provide each required field. | Pass |
| At least two primary sources | Arduino's UNO R3 datasheet and official UNO R3 product documentation are primary Arduino sources. The official Blink example is the third cited source. | Pass |
| Ordered cited path with at least two server-enforced checkpoints | Seven ordered future steps and the two required checkpoints are specified. T014/T015 must prove server enforcement; T002 records the acceptance input only. | Pass, implementation pending |
| Symbolic solver boundary and no model-owned transforms | The CAD section confines the future spatial relation to named UNO and USB connector features and reserves transform creation to the deterministic solver. | Pass, implementation pending |
| CAD source and license gate | The official UNO R3 CAD download is named as the only source candidate. A later asset is rejected unless its downloaded package states a redistributable license and its exact attribution/license is retained. | Pass, implementation pending |
| No unsupported custom geometry | The T020 record states that no custom template is required because the build contains no printed or machined part. | Pass |
| Fixture-first, five-tab UI, and weather-station preservation | The exclusions prohibit new navigation, cloud behavior, or a changed default path. Later implementation tasks remain responsible for regression proof in `DEMO_SAFE_MODE`. | Pass, implementation pending |

### Recorded verification

- Re-read `specs/005-authored-build/spec.md`, `plan.md`, and `tasks.md` before
  validation.
- Verified the official UNO R3 product page, official UNO R3 datasheet section
  4.1/4.3, and official Blink documentation at the locators named above.
- Ran a focused local brief-section and source-reference check, followed by
  `git diff --check`; both completed successfully.
- Ran `git fetch origin` and `git rebase origin/main`; Git reported that
  `codex/authored-build` is up to date.

## T003 runner initialization evidence

The runner found no `.sprint/authored-build.cursor` on its first invocation and
created it with the single value `T001`. That value was observed before T001 was
authorized or any implementation file was changed. Per the runner's required
completion flow, the cursor then advanced from `T001` to `T002` after T001 and
to `T003` after T002; its current `T003` value is therefore expected and does
not replace the initialization evidence.

`.sprint/status.yml` is preserved as read-only historical evidence. A focused
Git diff/status check confirms this authored-build work has not modified that
file.
