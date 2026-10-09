# SignSpeak Vulnerability Assessment Report (Phases 0–2)

This document catalogs identified security vulnerabilities and exposure vectors in the current SignSpeak codebase (as of Phase 2). It outlines the risks, attack vectors, and provides concrete recommendations for mitigation.

---

## 1. Path Traversal via Unsanitized Signer Handles

### Details
- **Location:** [CaptureControls.tsx](file:///Users/anirudh/Desktop/101/src/ui/CaptureControls.tsx#L5-L14)
- **Code snippet:**
  ```typescript
  a.download = `fingerspell_${signer || 'anon'}_${Date.now()}.jsonl`;
  ```
- **Vulnerability:** The `signer` handle input in the UI is tied directly to the Zustand store and is never sanitized before being interpolated into the download filename. 
- **Attack Vector:** An input like `../../../../sensitive_file` could cause the browser to attempt saving the file using relative pathing (if the browser does not strip it), writing files outside the browser's designated sandbox download folder, or leading to unexpected characters causing write failures.
- **Risk Level:** **Medium**
- **Mitigation:** Sanitize the `signer` string to strip out non-alphanumeric characters, slashes, or path markers before using it in any filesystem or link action:
  ```typescript
  const safeSigner = signer.replace(/[^a-zA-Z0-9_\-]/g, '');
  ```

---

## 2. Lack of Subresource Integrity (SRI) on CDN-Loaded Binaries

### Details
- **Location:** [holistic.ts](file:///Users/anirudh/Desktop/101/src/perception/holistic.ts#L7-L10)
- **Vulnerability:** WebAssembly binaries and model parameter files are loaded from dynamic CDN URLs without hash matching (no SRI integrity validation).
  ```typescript
  const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task';
  ```
- **Attack Vector:** If the jsDelivr CDN or the Google Cloud Storage bucket is compromised, an attacker could replace the WASM runtime or model asset with an exploit, leading to arbitrary code execution in the client's browser context.
- **Risk Level:** **Medium**
- **Mitigation:**
  - Standardize on self-hosting WASM resources and task models from the project's own secure origins (e.g., in `/public/models/holistic/`).
  - If CDNs must be used, implement SRI validations or dynamic integrity hashing inside the loader options if supported by `@mediapipe/tasks-vision`.

---

## 3. Absence of Content Security Policy (CSP)

### Details
- **Location:** [index.html](file:///Users/anirudh/Desktop/101/index.html)
- **Vulnerability:** No Content Security Policy (CSP) is defined in the application's head.
- **Attack Vector:** The application is highly vulnerable to Cross-Site Scripting (XSS) if any third-party script is injected or if user input is ever rendered unsafely. An attacker can load scripts from arbitrary external domains or leak data (like raw sign transcript strings) back to malicious endpoints.
- **Risk Level:** **High** (in production deployments)
- **Mitigation:** Implement a strict CSP in the `<head>` of `index.html`:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com; media-src 'self' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline';" />
  ```

---

## 4. Path Traversal and Symlink Exposure in Python Training Scripts

### Details
- **Location:** [train.py](file:///Users/anirudh/Desktop/101/ml/train.py#L41-L51)
- **Vulnerability:** The dataset globbing uses `sorted(data_dir.glob("*.jsonl"))` without checking if files are symbolic links or checking the base output path during writing.
- **Attack Vector:** If the training script is run on a shared system or cloud worker where datasets can be uploaded, a user could upload a dataset with a symbolic link pointing to a sensitive file (e.g., `~/.ssh/id_rsa` or `/etc/passwd`). The script will read and parse it, exposing details or crashing with parse errors that leak sensitive line contexts.
- **Risk Level:** **Low-Medium**
- **Mitigation:** Resolve the paths using `.resolve()` and ensure they reside within the workspace boundaries:
  ```python
  resolved_path = path.resolve()
  if not resolved_path.is_relative_to(project_root):
      raise PermissionError("Access denied: path outside workspace")
  ```

---

## 5. Unvalidated JSON Schema Deserialization

### Details
- **Location:** [classifier.ts](file:///Users/anirudh/Desktop/101/src/recognition/classifier.ts#L27-L37)
- **Vulnerability:** The model weights files (`model.json` and `labels.json`) are fetched and parsed directly into TypeScript runtime objects without schema validation.
- **Attack Vector:** If a compromised or custom model directory is fetched, malformed properties can crash the classifier, or properties with prototype keys can cause Prototype Pollution.
- **Risk Level:** **Low**
- **Mitigation:** Implement a simple schema validation wrapper or type guard verifying the JSON properties (`featureLen`, `layers`, `biases`, `weights`) match expected structures and sizes before assigning them to internal state.
