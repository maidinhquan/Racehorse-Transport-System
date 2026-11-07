using System.Globalization;
using System.Xml;
using System.Xml.Linq;
using Application.DTOs.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

// Code-defined layout, with no editable Word template or extra database content.
internal static class ContractFlatDocument
{
    public static string Build(ContractPdfModel model)
    {
        XNamespace office="urn:oasis:names:tc:opendocument:xmlns:office:1.0", text="urn:oasis:names:tc:opendocument:xmlns:text:1.0",
            style="urn:oasis:names:tc:opendocument:xmlns:style:1.0", fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
            table="urn:oasis:names:tc:opendocument:xmlns:table:1.0", svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0";
        string V(string key)=>model.Values.GetValueOrDefault(key)??"";
        string Money(decimal value)=>value.ToString("N0",CultureInfo.GetCultureInfo("vi-VN"));
        XElement P(string value,string kind="Body")
        {
            try { XmlConvert.VerifyXmlChars(value); }
            catch(XmlException) { throw Error("Contract text contains unsupported control characters.","VALIDATION_ERROR"); }
            var p=new XElement(text+"p",new XAttribute(text+"style-name",kind));
            var lines=value.Replace("\r\n","\n").Split('\n');
            for(var n=0;n<lines.Length;n++){if(n>0)p.Add(new XElement(text+"line-break"));p.Add(new XText(lines[n]));}
            return p;
        }
        XElement ParagraphStyle(string name,string size,bool bold=false,bool heading=false,bool centered=false)=>
            new(style+"style",new XAttribute(style+"name",name),new XAttribute(style+"family","paragraph"),
                new XElement(style+"paragraph-properties",new XAttribute(fo+"margin-bottom",name=="Cell"?"0cm":"0.16cm"),
                    new XAttribute(fo+"margin-top",heading?"0.25cm":"0cm"),new XAttribute(fo+"line-height","130%"),
                    new XAttribute(fo+"keep-with-next",heading?"always":"auto"),new XAttribute(fo+"text-align",centered?"center":"start")),
                new XElement(style+"text-properties",new XAttribute(style+"font-name","NotoSans"),new XAttribute(fo+"font-size",size),new XAttribute(fo+"font-weight",bold?"bold":"normal")));
        var styles=new XElement(office+"automatic-styles",
            new XElement(style+"page-layout",new XAttribute(style+"name","Page"),new XElement(style+"page-layout-properties",
                new XAttribute(fo+"page-width","21cm"),new XAttribute(fo+"page-height","29.7cm"),new XAttribute(fo+"margin","1.8cm"))),
            ParagraphStyle("Body","11pt"),ParagraphStyle("Cell","10pt"),ParagraphStyle("Note","9pt"),ParagraphStyle("Title","17pt",true,true,true),
            ParagraphStyle("Heading","14pt",true,true),ParagraphStyle("Clause","12pt",true,true),
            new XElement(style+"style",new XAttribute(style+"name","Grid"),new XAttribute(style+"family","table"),
                new XElement(style+"table-properties",new XAttribute(style+"width","17.4cm"),new XAttribute(table+"align","margins"))),
            new XElement(style+"style",new XAttribute(style+"name","GridCell"),new XAttribute(style+"family","table-cell"),
                new XElement(style+"table-cell-properties",new XAttribute(fo+"border","0.5pt solid #aaaaaa"),new XAttribute(fo+"padding","0.12cm"))));
        foreach(var count in new[]{2,3})styles.Add(new XElement(style+"style",new XAttribute(style+"name","Col"+count),new XAttribute(style+"family","table-column"),
            new XElement(style+"table-column-properties",new XAttribute(style+"column-width",(17.4m/count).ToString(CultureInfo.InvariantCulture)+"cm"))));
        var body=new XElement(office+"text");var grids=0;
        void Grid(IEnumerable<string[]> rows,int columns)
        {
            var grid=new XElement(table+"table",new XAttribute(table+"name","Grid"+(++grids)),new XAttribute(table+"style-name","Grid"),
                new XElement(table+"table-column",new XAttribute(table+"style-name","Col"+columns),new XAttribute(table+"number-columns-repeated",columns)));
            foreach(var row in rows)grid.Add(new XElement(table+"table-row",row.Select(value=>new XElement(table+"table-cell",
                new XAttribute(table+"style-name","GridCell"),new XAttribute(office+"value-type","string"),P(value,"Cell")))));
            body.Add(grid);
        }
        body.Add(P("HỢP ĐỒNG DỊCH VỤ VẬN CHUYỂN NGỰA","Title"),P("Mã hợp đồng: "+V("CONTRACT_CODE")+"\nMã yêu cầu: "+V("REQUEST_ID")),P("1. Các bên","Heading"));
        body.Add(P("Bên cung cấp: "+V("COMPANY_NAME")+"\nĐịa chỉ: "+V("COMPANY_ADDRESS")+
            (string.IsNullOrWhiteSpace(V("COMPANY_REPRESENTATIVE"))?"":"\nĐại diện: "+V("COMPANY_REPRESENTATIVE"))+
            "\nKhách hàng: "+V("CUSTOMER_FULL_NAME")+"\nEmail: "+V("CUSTOMER_EMAIL")+"\nĐiện thoại: "+V("CUSTOMER_PHONE")),P("2. Vận chuyển và thanh toán","Heading"));
        Grid(new[]{("Phương thức","TRANSPORT_MODE"),("Phạm vi","TRANSPORT_SCOPE"),("Điểm đón","DEPARTURE_LOCATION"),("Chuồng đón","PICKUP_STABLE"),
            ("Mã bưu chính nơi đón","PICKUP_POSTAL_CODE"),("Người đón","PICKUP_CONTACT_NAME"),("Điện thoại người đón","PICKUP_CONTACT_PHONE"),("Hướng dẫn đón","PICKUP_INSTRUCTIONS"),
            ("Điểm giao","DESTINATION_LOCATION"),("Chuồng giao","DELIVERY_STABLE"),("Mã bưu chính nơi giao","DELIVERY_POSTAL_CODE"),("Người nhận","DESIGNATED_RECEIVER_NAME"),
            ("Điện thoại người nhận","DESIGNATED_RECEIVER_PHONE"),("Hướng dẫn giao","DELIVERY_INSTRUCTIONS"),("Chăm sóc chung trong chuyến","CARE_INSTRUCTIONS"),
            ("Ngày đón","EXPECTED_DEPARTURE_DATETIME"),("Ngày giao","COMMITTED_DEADLINE_DATETIME"),("Giá hợp đồng (VND)","TOTAL_PRICE_VND"),
            ($"Cọc {V("DEPOSIT_RATE")}% (VND)","DEPOSIT_AMOUNT"),("Số tiền còn lại (VND)","REMAINING_AMOUNT"),("Ghi chú thương mại","COMMERCIAL_NOTES"),
            ("Hạn chung thanh toán, xác minh và ký OTP","COMPLETION_DEADLINE")}.Select(x=>new[]{x.Item1,V(x.Item2)}),2);
        if(model.Costs is { } costs){body.Add(P("Năm khoản giá hợp đồng (VND)","Clause"));
            Grid(new[]{("Vận chuyển",costs.Transport),("Tài xế và nhân viên",costs.Crew),("Giấy phép và thủ tục",costs.Permit),("Chăm sóc thú y",costs.Vet),
                ("Bảo hiểm",costs.Insurance),("Tổng giá hợp đồng",costs.Total)}.Select(x=>new[]{x.Item1,Money(x.Item2)}),2);}
        body.Add(P("Cọc được xác minh trước khi ký OTP. Chỉ sau khi ký thành công, yêu cầu mới được kích hoạt và tạo chuyến đi."),P("3. Danh sách ngựa","Heading"));
        Grid(new[]{new[]{"Tên","Microchip","Hộ chiếu"}}.Concat(model.Horses.Select(h=>new[]{h.GetValueOrDefault("HORSE_1_NAME")??"",h.GetValueOrDefault("HORSE_1_MICROCHIP")??"",h.GetValueOrDefault("HORSE_1_FEI_NO")??""})),3);
        foreach(var horse in model.Horses)if(!string.IsNullOrWhiteSpace(horse.GetValueOrDefault("HORSE_HEALTH_NOTES")) || !string.IsNullOrWhiteSpace(horse.GetValueOrDefault("HORSE_CARE")))
            body.Add(P(horse.GetValueOrDefault("HORSE_1_NAME")+"\nGhi chú sức khỏe: "+horse.GetValueOrDefault("HORSE_HEALTH_NOTES")+"\nChăm sóc trong chuyến: "+horse.GetValueOrDefault("HORSE_CARE")));
        body.Add(P("4. Điều khoản hợp đồng","Heading"),P("Hợp đồng bao gồm đầy đủ 12 điều khoản bắt buộc dưới đây."));
        foreach(var clause in model.Clauses??[])body.Add(P(clause.Title,"Clause"),P(clause.Content));
        if(model.AdditionalClauses is {Count:>0}){body.Add(P("5. Điều khoản bổ sung","Heading"));for(var n=0;n<model.AdditionalClauses.Count;n++)body.Add(P("Bổ sung "+(n+1),"Clause"),P(model.AdditionalClauses[n]));}
        body.Add(P("Nội dung này được cố định khi phát hành. Xác nhận OTP được lưu riêng và gắn với mã SHA-256 của chính PDF này.","Note"));
        // LibreOffice detects flat ODT from the XML declaration, not just the extension.
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"+new XDocument(new XElement(office+"document",
            new XAttribute(XNamespace.Xmlns+"office",office),new XAttribute(XNamespace.Xmlns+"text",text),new XAttribute(XNamespace.Xmlns+"style",style),
            new XAttribute(XNamespace.Xmlns+"fo",fo),new XAttribute(XNamespace.Xmlns+"table",table),new XAttribute(XNamespace.Xmlns+"svg",svg),
            new XAttribute(office+"version","1.2"),new XAttribute(office+"mimetype","application/vnd.oasis.opendocument.text"),
            new XElement(office+"font-face-decls",new XElement(style+"font-face",new XAttribute(style+"name","NotoSans"),new XAttribute(svg+"font-family","Noto Sans"))),
            new XElement(office+"styles"),styles,new XElement(office+"master-styles",new XElement(style+"master-page",new XAttribute(style+"name","Standard"),new XAttribute(style+"page-layout-name","Page"))),
            new XElement(office+"body",body))).ToString();
    }
}
