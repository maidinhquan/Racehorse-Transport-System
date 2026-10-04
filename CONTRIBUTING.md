
```md
# Frontend Coding Rules

## 1. Folder Structure

Toàn bộ code frontend phải nằm trong:

```text
frontend/
└── src/
```

Cấu trúc chuẩn:

```text
src/
├── app/
├── assets/
├── features/
├── shared/
├── App.tsx
└── main.tsx
```

### Quy tắc

Không tự ý tạo thêm các folder cấp cao trong `src/` như:

```text
src/pages/
src/services/
src/models/
src/common/
```

Nếu thực sự cần thêm folder mới ở cấp `src/`, phải thống nhất với team trước.

---

## 2. Feature Structure

Mỗi nghiệp vụ chính của hệ thống phải được tổ chức thành một feature riêng trong:

```text
src/features/
```

Các feature hiện tại:

```text
features/
├── auth/
├── horse-management/
├── transport-request/
├── document-management/
├── quarantine-customs/
├── route-planning/
├── trip-tracking/
├── incident-management/
├── payment/
└── dashboard/
```

Mỗi feature chỉ chứa code liên quan trực tiếp đến nghiệp vụ đó.

Ví dụ:

```text
features/
└── horse-management/
```

chỉ chứa các chức năng liên quan đến quản lý ngựa.

Không đặt code của `payment`, `transport-request` hoặc các nghiệp vụ khác vào trong `horse-management`.

---

## 3. Structure Inside Each Feature

Cấu trúc tiêu chuẩn của một feature:

```text
feature-name/
├── pages/
├── components/
├── api/
├── hooks/
├── types/
└── validation/
```

Ý nghĩa:

- `pages/`: chứa các màn hình hoàn chỉnh của feature.
- `components/`: chứa các React component chỉ được sử dụng trong feature đó.
- `api/`: chứa các function dùng để gọi Backend API.
- `hooks/`: chứa các custom React Hooks của feature.
- `types/`: chứa các interface và type TypeScript.
- `validation/`: chứa schema và logic validate form.

Ví dụ:

```text
horse-management/
├── pages/
│   ├── HorseListPage.tsx
│   ├── HorseDetailPage.tsx
│   └── CreateHorsePage.tsx
│
├── components/
│   ├── HorseCard.tsx
│   ├── HorseForm.tsx
│   └── HorseTable.tsx
│
├── api/
│   └── horseApi.ts
│
├── hooks/
│   └── useHorses.ts
│
├── types/
│   └── horse.types.ts
│
└── validation/
    └── horse.schema.ts
```

### Lưu ý

Không bắt buộc mọi feature phải có đầy đủ tất cả các folder trên.

Chỉ tạo folder khi thực sự cần sử dụng.

Ví dụ feature chỉ có:

```text
dashboard/
├── pages/
└── components/
```

thì không cần tạo thêm các folder rỗng như:

```text
api/
hooks/
types/
validation/
```

---

## 4. General Rule

Nguyên tắc chung:

```text
Code thuộc một nghiệp vụ
→ đặt trong features/<feature-name>/

Code dùng chung cho nhiều feature
→ đặt trong shared/

Code cấu hình toàn bộ ứng dụng
→ đặt trong app/

Hình ảnh, icon, CSS và tài nguyên tĩnh
→ đặt trong assets/
```

Không tự ý thay đổi cấu trúc folder chung nếu chưa thống nhất với team.
```

Bạn lưu file này ở root repository:

```text
Racehorse-Transport-System/
├── frontend/
├── backend/
├── README.md
├── CONTRIBUTING.md
└── .gitignore
```

Sau đó đẩy lên Git bằng:

```bash
git add CONTRIBUTING.md
git commit -m "docs: add frontend folder structure rules"
git push
```

Nếu muốn dễ quản lý hơn, tôi khuyên `README.md` chỉ để giới thiệu project, còn toàn bộ rule code, branch, commit, pull request để trong `CONTRIBUTING.md`.