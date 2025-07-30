# ---- Stage 1: Builder ----
# ขั้นตอนนี้จะใช้สร้างสภาพแวดล้อมที่สมบูรณ์สำหรับติดตั้งไลบรารีทั้งหมด
# ทำให้ Image สุดท้ายมีขนาดเล็ก เพราะไม่ต้องเก็บไฟล์ชั่วคราวจากการติดตั้ง
FROM python:3.11-slim as builder

# กำหนด Working Directory
WORKDIR /app

# สร้าง Virtual Environment ภายใน Image
# เพื่อแยก Dependencies ของโปรเจกต์ออกจาก Python ของระบบ
RUN python -m venv /opt/venv

# ตั้งค่า PATH ของ Image ให้เรียกใช้ Python และ pip จาก Virtual Environment ที่เราสร้าง
ENV PATH="/opt/venv/bin:$PATH"

# คัดลอกไฟล์ requirements.txt เข้ามาใน Image
COPY backend/requirements.txt .

# ติดตั้ง Dependencies ทั้งหมดจาก requirements.txt
# --no-cache-dir จะไม่เก็บ cache ของ pip ทำให้ Image มีขนาดเล็กลง
RUN pip install --no-cache-dir -r requirements.txt


# ---- Stage 2: Final Image ----
# ขั้นตอนนี้จะสร้าง Image สุดท้ายที่เราจะนำไปใช้งานจริง
# โดยจะดึงเฉพาะสิ่งที่จำเป็นมาจาก Stage 1
FROM python:3.11-slim

# กำหนด Working Directory
WORKDIR /app

# คัดลอก Virtual Environment ที่ติดตั้ง Dependencies ครบถ้วนแล้วจาก Stage 1
COPY --from=builder /opt/venv /opt/venv

# คัดลอกโค้ดแอปพลิเคชัน, โฟลเดอร์ข้อมูล และโฟลเดอร์โมเดล
COPY backend ./backend
COPY shhs_subset ./shhs_subset
COPY backend/models ./models

# ตั้งค่า PATH ให้ชี้ไปที่ Python ใน Virtual Environment ที่คัดลอกมา
ENV PATH="/opt/venv/bin:$PATH"

# คำสั่งที่จะรันเมื่อ Container เริ่มทำงาน
# คือการสั่งให้รันไฟล์ main_production.py ด้วย Python
CMD ["python", "backend/main_production.py"]