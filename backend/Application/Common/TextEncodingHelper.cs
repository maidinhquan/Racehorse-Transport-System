using System.Text;

namespace Application.Common
{
    public static class TextEncodingHelper
    {
        private static readonly Dictionary<char, byte> Win1252Lookup = new()
        {
            { '\u20ac', 0x80 }, { '\u201a', 0x82 }, { '\u0192', 0x83 }, { '\u201e', 0x84 },
            { '\u2026', 0x85 }, { '\u2020', 0x86 }, { '\u2021', 0x87 }, { '\u02c6', 0x88 },
            { '\u2030', 0x89 }, { '\u0160', 0x8a }, { '\u2039', 0x8b }, { '\u0152', 0x8c },
            { '\u017d', 0x8e }, { '\u2018', 0x91 }, { '\u2019', 0x92 }, { '\u201c', 0x93 },
            { '\u201d', 0x94 }, { '\u2022', 0x95 }, { '\u2013', 0x96 }, { '\u2014', 0x97 },
            { '\u02dc', 0x98 }, { '\u2122', 0x99 }, { '\u0161', 0x9a }, { '\u203a', 0x9b },
            { '\u0153', 0x9c }, { '\u017e', 0x9e }, { '\u0178', 0x9f }
        };

        /// <summary>
        /// Recovers UTF-8 text that was mistakenly decoded as Windows-1252 / ANSI (e.g. "Nguyá»...n VÄƒn A" -> "Nguyễn Văn A")
        /// </summary>
        public static string FixMojibake(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return input ?? string.Empty;

            // Handle literal 3-dots substitution of ellipsis character
            var s = input.Replace("á»...", "á»\u2026");

            // Fast exit if no typical UTF-8 mojibake characters are present
            if (!s.Contains('á') && !s.Contains('Ä') && !s.Contains('Ã') && !s.Contains('Â') && !s.Contains('»') && !s.Contains('ƒ'))
            {
                return s;
            }

            try
            {
                var bytes = new List<byte>(s.Length);
                foreach (var ch in s)
                {
                    if (ch < 256)
                    {
                        bytes.Add((byte)ch);
                    }
                    else if (Win1252Lookup.TryGetValue(ch, out var b))
                    {
                        bytes.Add(b);
                    }
                    else
                    {
                        return s;
                    }
                }

                var decoded = Encoding.UTF8.GetString(bytes.ToArray());
                if (!decoded.Contains('\uFFFD') && decoded.Length < s.Length)
                {
                    return decoded;
                }
            }
            catch
            {
                // Return original on decode failure
            }

            return s;
        }

        /// <summary>
        /// Fixes mojibake and strips parenthetical notes (e.g. "(Logistics Manager)")
        /// </summary>
        public static string CleanFullName(string? fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return string.Empty;
            var fixedText = FixMojibake(fullName);
            var clean = System.Text.RegularExpressions.Regex.Replace(fixedText, @"\s*\([^)]*\)", "").Trim();
            return string.IsNullOrEmpty(clean) ? fixedText.Trim() : clean;
        }
    }
}
