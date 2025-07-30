# Dockerfile

# ---- Stage 1: Builder ----
# สร้างสภาพแวดล้อมสำหรับการ build และติดตั้ง Dependencies ทั้งหมด
FROM python:3.11-slim as builder

WORKDIR /app

# สร้าง virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# อัปเดต pip และติดตั้ง dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ---- Stage 2: Final Image ----
# สร้าง Image สุดท้ายที่สะอาดและมีขนาดเล็ก
FROM python:3.11-slim

WORKDIR /app

# คัดลอก virtual environment จาก stage แรกมาใส่
COPY --from=builder /opt/venv /opt/venv

# คัดลอกโค้ดแอปพลิเคชันและข้อมูลที่จำเป็น
COPY backend ./backend
COPY shhs_subset ./shhs_subset

# ตั้งค่า PATH ให้ชี้ไปที่ Python ใน virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# คำสั่งสำหรับรันแอปพลิเคชัน
CMD ["python", "backend/main_production.py"]