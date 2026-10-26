namespace WebApi.Extensions.Flow1;

// Swagger-only controls. Values go through Swagger's normal form state and serializer.
internal static class SwaggerRequestEditor
{
    internal const string Styles = """
        <style>
        .swagger-ui .request-json-editor,.swagger-ui .request-file-picker{width:100%;max-width:1100px;padding:16px;border:1px solid #ccd9d3;border-radius:8px;background:#fff;box-sizing:border-box}
        .swagger-ui .request-json-editor h4,.swagger-ui .request-file-picker h4{margin:0 0 8px;font-size:16px}
        .swagger-ui .request-json-editor textarea{display:block;width:100%;min-height:480px;resize:vertical;font:13px/1.6 Consolas,monospace;box-sizing:border-box;white-space:pre;tab-size:2;background:#f8faf9}
        .swagger-ui .request-editor-tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0}
        .swagger-ui .request-file-picker input[type=file]{display:block;width:100%;max-width:none;margin:12px 0}
        .swagger-ui .request-file-picker ul{padding-left:20px;overflow-wrap:anywhere}
        .swagger-ui .request-editor-error{color:#b42318;white-space:pre-wrap}
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
                const state = window.ui.oas3Selectors.requestBodyValue(match[1], method);
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
                const [error, setError] = React.useState("");
                const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value || {}, null, 2);
                function format() {
                    try { props.onChange(JSON.stringify(JSON.parse(value), null, 2), props.keyName); setError(""); }
                    catch (e) { setError("JSON chưa hợp lệ: " + e.message); }
                }
                return h("section", {className: "request-json-editor"},
                    h("h4", null, "1. Thông tin yêu cầu — JSON"),
                    h("p", null, "Sửa thông tin và danh sách documents trong JSON. Chọn các tệp có tên khớp documents[].fileName ở phần 2 bên dưới."),
                    h("div", {className: "request-editor-tools"},
                        h("button", {type: "button", className: "btn", disabled: props.disabled, onClick: format}, "Định dạng JSON"),
                        h("span", null, "Ngày và địa chỉ, người nhận/giao, ngựa, hướng dẫn và giấy tờ")),
                    h("textarea", {"aria-label": "Thông tin yêu cầu JSON", spellCheck: false, value: value, disabled: props.disabled,
                        onChange: function(e) { props.onChange(e.target.value, props.keyName); setError(""); }}),
                    error ? h("p", {role: "alert", className: "request-editor-error"}, error) : null);
            }
            function FilePicker(props) {
                const files = props.value && props.value.toArray ? props.value.toArray() : (Array.isArray(props.value) ? props.value : []);
                const input = React.useRef(null);
                function clear() { props.onChange(system.Im.List()); if (input.current) input.current.value = ""; }
                return h("section", {className: "request-file-picker"},
                    h("h4", null, "2. Giấy tờ đính kèm — chọn tệp"),
                    h("p", null, "Có thể chọn nhiều tệp cùng lúc. Mỗi tệp tối đa 10 MiB; tổng tối đa 60 MiB và 33 tệp. Tên tệp phải khớp documents[].fileName trong JSON."),
                    h("input", {ref: input, type: "file", multiple: true, accept: ".pdf,.png,.jpg,.jpeg", disabled: props.disabled,
                        "aria-label": "Chọn giấy tờ đính kèm", onChange: function(e) { props.onChange(system.Im.List(Array.from(e.target.files || []))); }}),
                    files.length ? h("ul", null, files.map(function(file, index) {
                        return h("li", {key: index}, file.name + " (" + Math.ceil(file.size / 1024) + " KiB)");
                    })) : h("p", null, "Chưa chọn tệp. Nếu JSON có documents mới, chọn đủ các tệp tương ứng trước khi Execute."),
                    h("button", {type: "button", className: "btn", onClick: clear, disabled: props.disabled || !files.length}, "Bỏ chọn tất cả tệp"));
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
