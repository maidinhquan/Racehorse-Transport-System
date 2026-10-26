namespace WebApi.Extensions.Flow1;

// Swagger-only controls. Values go through Swagger's normal form state and serializer.
internal static class SwaggerRequestEditor
{
    internal const string Styles = """
        <style>
        .swagger-ui .request-json-editor,.swagger-ui .request-file-picker{width:100%;max-width:1100px;padding:16px;border:1px solid #ccd9d3;border-radius:8px;background:#fff;box-sizing:border-box}
        .swagger-ui .request-json-editor h4,.swagger-ui .request-file-picker h4{margin:0 0 8px;font-size:16px}
        .swagger-ui .request-json-editor textarea{display:block;width:100%;min-height:480px;resize:vertical;font:13px/1.6 Consolas,monospace;box-sizing:border-box;white-space:pre;tab-size:2;background:#f8faf9}
        .swagger-ui .request-file-picker input[type=file]{display:block;width:100%;max-width:none;margin:12px 0}
        .swagger-ui .request-file-picker ul{padding-left:20px;overflow-wrap:anywhere}
        .swagger-ui .request-editor-error{color:#b42318;white-space:pre-wrap}
        .swagger-ui .request-document-card{border:1px solid #d6dfda;border-radius:6px;padding:12px;margin:10px 0;background:#f8faf9}
        .swagger-ui .request-document-fields{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}
        .swagger-ui .request-document-fields label{display:flex;flex:1 1 180px;flex-direction:column;gap:6px;font-weight:normal}
        .swagger-ui .request-document-fields input,.swagger-ui .request-document-fields select{width:100%;max-width:none;box-sizing:border-box}
        </style>
        """;

    internal const string Script = """
        const previousRequestInterceptor = configObject.requestInterceptor;
        configObject.requestInterceptor = async function(request) {
            if (previousRequestInterceptor) request = await previousRequestInterceptor(request);
            const match = new URL(request.url, window.location.href).pathname.match(/(\/api\/customer\/requests(?:\/[^/]+)?)$/);
            const method = (request.method || "").toLowerCase();
            const isSubmission = match && (method === "post" && match[1] === "/api/customer/requests" || method === "put" && match[1] !== "/api/customer/requests");
            if (isSubmission && request.body instanceof FormData) {
                // swagger-client parses JSON-looking strings and explodes them by default.
                // Restore this endpoint's actual contract: one JSON text field plus files.
                // Swagger stores PUT form state under its route template, not the concrete request ID.
                const path = method === "put" ? "/api/customer/requests/{requestId}" : match[1];
                const state = window.ui.oas3Selectors.requestBodyValue(path, method);
                const data = state && state.getIn(["Data", "value"]);
                if (typeof data === "string") {
                    const body = new FormData(); body.append("Data", data);
                    const selected = state.getIn(["Files", "value"]);
                    const files = selected && selected.toArray ? selected.toArray() : (Array.isArray(selected) ? selected : []);
                    const formdata = {Data: data};
                    files.forEach(function(file, index) {
                        if (file instanceof File) { body.append("Files", file, file.name); formdata["Files_**[]" + index] = file; }
                    });
                    request.body = body; request.formdata = formdata;
                    Object.keys(request.headers || {}).forEach(function(name) {
                        if (name.toLowerCase() === "content-type") delete request.headers[name];
                    });
                }
            }
            return request;
        };
        configObject.plugins = (configObject.plugins || []).concat([function RequestSubmissionEditors(system) {
            const React = system.React;
            const h = React.createElement;
            function JsonEditor(props) {
                const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value || {}, null, 2);
                React.useEffect(function() {
                    if (props.dispatchInitialValue) props.onChange(value, props.keyName);
                }, []);
                return h("section", {className: "request-json-editor"},
                    h("h4", null, "1. Thông tin yêu cầu — JSON"),
                    h("p", null, "Sửa thông tin yêu cầu tại đây. Chọn giấy tờ ở phần 2; Swagger tự cập nhật documents trong JSON, không cần ghép tên file thủ công."),
                    h("textarea", {"aria-label": "Thông tin yêu cầu JSON", spellCheck: false, value: value, disabled: props.disabled,
                        onChange: function(e) { props.onChange(e.target.value, props.keyName); }}));
            }
            function FilePicker(props) {
                const root = React.useRef(null);
                const [error, setError] = React.useState("");
                const [, refresh] = React.useReducer(function(n) { return n + 1; }, 0);
                const shared = [["INVITATION_LETTER", "Thư mời"], ["COMPETITION_REGISTRATION", "Giấy đăng ký tham gia thi đấu"], ["ATA_CARNET", "Sổ ATA Carnet"]];
                const sharedTypes = shared.map(function(item) { return item[0]; });
                React.useEffect(function() { refresh(); return system.getStore().subscribe(refresh); }, []);
                function context() {
                    const block = root.current && root.current.closest(".opblock");
                    const path = block && block.querySelector(".opblock-summary-path").textContent.trim();
                    const method = block && block.querySelector(".opblock-summary-method").textContent.trim().toLowerCase();
                    if (!path) throw new Error("Không xác định được form yêu cầu.");
                    const state = system.oas3Selectors.requestBodyValue(path, method) || system.Im.Map();
                    // Swagger displays schema examples before dispatching any field changes.
                    const editor = block.querySelector(".request-json-editor textarea");
                    const text = state.getIn(["Data", "value"]) ?? (editor && editor.value);
                    const data = JSON.parse(text);
                    if (!data || typeof data !== "object" || Array.isArray(data) || (data.documents != null && !Array.isArray(data.documents)))
                        throw new Error("JSON phải là đối tượng yêu cầu; documents phải là danh sách hoặc null.");
                    const selected = state.getIn(["Files", "value"]) || props.value;
                    const files = (selected && selected.toArray ? selected.toArray() : (Array.isArray(selected) ? selected : []))
                        .filter(function(file) { return file instanceof File; });
                    return {path: path, method: method, state: state, data: data, docs: data.documents || [], files: files};
                }
                function save(ctx, docs, files) {
                    if (docs.length > 3 || files.length > 3 || files.some(function(f) { return f.size > 10 * 1024 * 1024; }) ||
                        files.reduce(function(total, f) { return total + f.size; }, 0) > 30 * 1024 * 1024)
                        throw new Error("Tối đa 3 giấy tờ chung, mỗi tệp 10 MiB và tổng 30 MiB.");
                    const names = docs.map(function(d) { return d.fileName; });
                    const scopes = docs.map(function(d) { return d.documentType; });
                    if (new Set(names).size !== names.length) throw new Error("Tên file bị trùng. Đổi tên file để mỗi giấy tờ có một tên riêng.");
                    if (new Set(scopes).size !== scopes.length) throw new Error("Mỗi loại giấy tờ chung chỉ có một file. Chọn thay thế tại ô đã có.");
                    // Swagger's multipart reducer updates one field per action.
                    const pathMethod = [ctx.path, ctx.method];
                    system.oas3Actions.setRequestBodyValue({pathMethod: pathMethod,
                        value: system.Im.Map({Data: JSON.stringify(Object.assign({}, ctx.data, {documents: docs}), null, 2)})});
                    system.oas3Actions.setRequestBodyValue({pathMethod: pathMethod, value: system.Im.Map({Files: system.Im.List(files)})});
                    setError("");
                }
                function change(index, doc, file) {
                    try {
                        const ctx = context();
                        if (!sharedTypes.includes(doc.documentType) || "horseId" in doc)
                            throw new Error("Chỉ nhận ba loại giấy tờ chung, không truyền horseId.");
                        const old = ctx.docs[index];
                        const updated = Object.assign({}, doc);
                        if (file) updated.fileName = file.name;
                        const docs = ctx.docs.slice();
                        if (index < 0) docs.push(updated); else docs[index] = updated;
                        let files = ctx.files;
                        if (file) files = files.filter(function(f) { return !old || f.name !== old.fileName; }).concat([file]);
                        save(ctx, docs, files);
                        return true;
                    } catch (e) { setError("Không cập nhật giấy tờ: " + e.message); return false; }
                }
                function remove(index) {
                    try {
                        const ctx = context(); const old = ctx.docs[index];
                        save(ctx, ctx.docs.filter(function(_, i) { return i !== index; }), ctx.files.filter(function(f) { return f.name !== old.fileName; }));
                    } catch (e) { setError(e.message); }
                }
                let ctx;
                try { ctx = context(); } catch (_) { ctx = {docs: [], files: [], data: {horses: []}}; }
                function picker(label, onFile, disabled) {
                    return h("input", {type: "file", accept: ".pdf,.png,.jpg,.jpeg", disabled: props.disabled || disabled,
                        "aria-label": label, onChange: function(e) { const file = e.target.files && e.target.files[0]; if (file) onFile(file); e.target.value = ""; }});
                }
                function fileName(doc) {
                    if (!doc || !doc.fileName) return "Chưa chọn tệp.";
                    const file = ctx.files.find(function(f) { return f.name === doc.fileName; });
                    return file ? file.name + " (" + Math.ceil(file.size / 1024) + " KiB)" : doc.fileName + " — chưa chọn tệp tương ứng.";
                }
                return h("section", {ref: root, className: "request-file-picker"},
                    h("h4", null, "2. Giấy tờ đính kèm — chọn đúng loại"),
                    h("p", null, "Chọn từng file tại đúng ô bên dưới. Swagger tự cập nhật documents trong JSON. Chỉ ba loại giấy tờ chung của yêu cầu; tối đa 3 tệp, mỗi tệp 10 MiB, tổng 30 MiB. Không upload giấy tờ riêng từng ngựa ở bước này."),
                    h("h5", null, "Giấy tờ chung của yêu cầu (không gắn ngựa)"),
                    shared.map(function(item) {
                        const index = ctx.docs.findIndex(function(d) { return d.documentType === item[0] && !d.horseId; });
                        const doc = ctx.docs[index];
                        return h("div", {className: "request-document-card", key: item[0]}, h("strong", null, item[1]), " ", h("code", null, item[0]),
                            picker("Chọn file " + item[1], function(file) { change(index, {documentType: item[0], fileName: file.name}, file); }),
                            h("p", null, fileName(doc)),
                            doc ? h("button", {type: "button", className: "btn", disabled: props.disabled, onClick: function() { remove(index); }}, "Bỏ tệp mới này") : null);
                    }),
                    error ? h("p", {role: "alert", className: "request-editor-error"}, error) : null);
            }
            return {wrapComponents: {
                JsonSchema_string: function(Original) { return function(props) {
                    return props.schema && props.schema.get("x-request-json-editor") ? h(JsonEditor, props) : h(Original, props);
                }; },
                JsonSchema_array: function(Original) { return function(props) {
                    return props.schema && props.schema.get("x-request-file-picker") ? h(FilePicker, props) : h(Original, props);
                }; }
            }};
        }]);
        """;
}
