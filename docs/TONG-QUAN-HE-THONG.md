# Hệ thống RAG — Tổng quan (bản demo)

> Tài liệu tổng hợp để giới thiệu với khách hàng.

## 1. Hệ thống làm gì

Hệ thống **quản lý cơ hội dự án (proposal) + case study** kèm **trợ lý hỏi-đáp AI (RAG)**:
người dùng hỏi bằng tiếng Việt, hệ tự tìm trong kho dữ liệu và trả lời **có trích nguồn**, không bịa.

## 2. Kiến trúc (chạy on-prem, chỉ LLM ra ngoài)

```
   Người dùng ──► CMS Web (quản lý + hỏi-đáp)
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
   PostgreSQL    Vector DB     Embedding bge-m3
   (số liệu)    (pgvector)     (chạy LOCAL — tài liệu không gửi ra ngoài)
                      │
                Claude (qua firewall) — chỉ khâu sinh câu trả lời cuối
```

## 3. Hai loại dữ liệu (đúng việc, đúng kho)

| Kho | Lưu gì | Trả lời câu |
|---|---|---|
| **PostgreSQL** (có cấu trúc) | effort, khách hàng, trạng thái, WBS, ngày... | "tổng effort?", "chức năng nào tốn nhất?", "bao nhiêu case study?" |
| **Vector DB (pgvector)** | nội dung tài liệu đã "vector hoá" | "HCMS làm gì?", "case study nào giống?", "scope gồm gì?" |

## 4. Tính năng đã có

### a) CMS quản lý dữ liệu (giao diện web)
- CRUD **Proposal** + CRUD **Case Study** (thêm / sửa / xoá)
- **Upload tài liệu**: pptx, xlsx, pdf, docx, txt, md → tự xử lý vào kho
- **Tự điền (auto-fill)**: upload file estimate / case study → hệ **tự trích các trường + toàn bộ chức năng WBS**, người dùng đỡ phải nhập tay

### b) Pipeline xử lý tài liệu (tự động)
- Upload → đọc nội dung → chia đoạn → **vector hoá (local)** → lưu vào kho, gắn đúng dự án
- Quản lý **theo từng tài liệu**: nạp lại / xoá độc lập, không ảnh hưởng dữ liệu khác

### c) Hỏi-đáp RAG — 2 kênh truy cập
| Kênh | Cho ai | Cơ chế |
|---|---|---|
| **Web Hỏi-đáp** | Nhân viên nội bộ | Hỏi trên web → server tự tổng hợp |
| **MCP** | User dùng Claude riêng | Claude của họ nối vào, gọi tool truy xuất, tự tổng hợp bằng tài khoản của họ |

### d) Bảo mật & phân quyền
- **Đăng nhập admin** (tài khoản/mật khẩu) — **mọi trang CMS đều phải đăng nhập** mới vào
- **Cấp token theo từng user** cho kênh MCP: admin duyệt ai thì người đó vào được, **thu hồi bất cứ lúc nào**
- Trang **quản lý token** + trang **xem user nào đang có quyền**

## 5. Điểm mạnh

- ✅ **Tài liệu không rời hệ thống** khi xử lý (embedding chạy local) — hợp yêu cầu bảo mật on-prem
- ✅ **Hiểu xuyên ngôn ngữ** (hỏi tiếng Việt, tài liệu Hàn / Nhật / Anh vẫn tìm ra)
- ✅ **Trả lời chính xác + trích nguồn**, không bịa; câu số liệu lấy từ DB, câu nội dung lấy từ vector
- ✅ **Kiểm soát truy cập**: đăng nhập + cấp/thu hồi token theo user
- ✅ Phân tách rõ: **nhập liệu (CMS)** và **truy vấn (RAG / MCP)**

## 6. Dữ liệu demo hiện tại

1 proposal (**HCMS**, 66 chức năng WBS) · 6 case study · ~173 đoạn dữ liệu đã vector hoá.

---

## Thành phần kỹ thuật (tham khảo)

| Lớp | Công nghệ |
|---|---|
| Cơ sở dữ liệu | PostgreSQL 17 + pgvector (1 container, 2 vai) |
| Embedding | bge-m3 (1024 chiều, đa ngữ, chạy local) |
| Web/CMS | FastAPI + Jinja2 |
| LLM tổng hợp | Claude (demo: `claude -p` qua subscription) |
| Truy cập ngoài | MCP server (Streamable HTTP) + token theo user |

### Cấu trúc thư mục
```
rag-system/
├─ docker-compose.yml          # Postgres + pgvector
├─ db/                         # schema + migration (document, api_token)
├─ ingest.py                   # nạp dữ liệu theo lô (batch)
├─ ask.py                      # hỏi-đáp CLI
└─ cms/                        # ứng dụng web
   ├─ main.py                  # CRUD + upload + đăng nhập + admin token + hỏi-đáp
   ├─ pipeline.py / parsers.py / extract.py   # xử lý & trích tài liệu
   ├─ embedding.py / db.py / rag.py / auth.py
   ├─ mcp_server.py            # MCP server (tool RAG + auth token)
   └─ templates/               # giao diện
```

### Một câu cho khách

> *"Hệ thống số hoá kho proposal & case study, cho phép hỏi-đáp bằng AI có trích nguồn;
> tài liệu xử lý ngay trong hạ tầng nội bộ, có đăng nhập và phân quyền truy cập theo từng người."*
