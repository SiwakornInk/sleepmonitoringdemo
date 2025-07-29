#!/usr/bin/env python3
"""
Test script to verify the Sleep Monitoring setup
Run this after setup to check if everything is working
"""

import sys
import requests
import psycopg2
from pathlib import Path
import torch
import json
from colorama import init, Fore, Style

# Initialize colorama for colored output
init()

def print_status(message, status):
    """Print colored status messages"""
    if status == "OK":
        print(f"{message} [{Fore.GREEN}✓ OK{Style.RESET_ALL}]")
    elif status == "WARNING":
        print(f"{message} [{Fore.YELLOW}⚠ WARNING{Style.RESET_ALL}]")
    else:
        print(f"{message} [{Fore.RED}✗ FAIL{Style.RESET_ALL}]")

def test_database():
    """Test PostgreSQL connection"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="sleep_monitoring",
            user="sleepuser",
            password="sleeppass123"
        )
        conn.close()
        print_status("PostgreSQL connection", "OK")
        return True
    except Exception as e:
        print_status("PostgreSQL connection", "FAIL")
        print(f"  Error: {e}")
        return False

def test_backend_api():
    """Test FastAPI backend"""
    try:
        response = requests.get("http://localhost:8000")
        if response.status_code == 200:
            print_status("Backend API", "OK")
            return True
        else:
            print_status("Backend API", "FAIL")
            return False
    except Exception as e:
        print_status("Backend API", "FAIL")
        print(f"  Error: {e}")
        return False

def test_frontend():
    """Test Next.js frontend"""
    try:
        response = requests.get("http://localhost:3000")
        if response.status_code == 200:
            print_status("Frontend", "OK")
            return True
        else:
            print_status("Frontend", "FAIL")
            return False
    except Exception:
        print_status("Frontend", "FAIL")
        print("  Make sure frontend is running: npm run dev")
        return False

def test_models():
    """Test if model files exist"""
    model_paths = [
        Path("backend/models/4_sleep_stage_eeg_only_augmented/model.pth"),
        Path("backend/models/6_apnea_eeg_continuous_hr/model.pth")
    ]
    
    models_found = True
    for path in model_paths:
        if path.exists():
            print_status(f"Model file: {path.name}", "OK")
        else:
            print_status(f"Model file: {path.name}", "WARNING")
            print(f"  App will run in DEMO MODE")
            models_found = False
    
    return models_found

def test_session_creation():
    """Test creating a session"""
    try:
        response = requests.post("http://localhost:8000/api/session/start")
        if response.status_code == 200:
            data = response.json()
            print_status("Session creation", "OK")
            print(f"  Session ID: {data['session_id']}")
            return data['session_id']
        else:
            print_status("Session creation", "FAIL")
            return None
    except Exception as e:
        print_status("Session creation", "FAIL")
        print(f"  Error: {e}")
        return None

def test_websocket():
    """Test WebSocket connection"""
    try:
        import websocket
        
        ws = websocket.WebSocket()
        ws.connect("ws://localhost:8000/ws/test_session")
        ws.close()
        print_status("WebSocket connection", "OK")
        return True
    except ImportError:
        print_status("WebSocket test", "WARNING")
        print("  Install websocket-client to test: pip install websocket-client")
        return False
    except Exception as e:
        print_status("WebSocket connection", "FAIL")
        print(f"  Error: {e}")
        return False

def main():
    print("\n" + "="*50)
    print("Sleep Monitoring Setup Verification")
    print("="*50 + "\n")
    
    # Track overall status
    all_ok = True
    
    # Run tests
    print("Testing components...\n")
    
    if not test_database():
        all_ok = False
        print("\n💡 Fix: Make sure Docker is running and PostgreSQL container is up")
        print("   Run: docker-compose up -d")
    
    if not test_backend_api():
        all_ok = False
        print("\n💡 Fix: Start the backend server")
        print("   Run: cd backend && python main.py")
    
    if not test_frontend():
        all_ok = False
        print("\n💡 Fix: Start the frontend server")
        print("   Run: cd frontend && npm run dev")
    
    models_ok = test_models()
    if not models_ok:
        print("\n💡 Note: Copy your .pth model files to run with real predictions")
    
    if test_backend_api():
        session_id = test_session_creation()
        test_websocket()
    
    # Summary
    print("\n" + "="*50)
    if all_ok and models_ok:
        print(f"{Fore.GREEN}✓ All systems operational!{Style.RESET_ALL}")
        print("\nYou can now access:")
        print("- Frontend: http://localhost:3000")
        print("- Backend API: http://localhost:8000")
        print("- API Docs: http://localhost:8000/docs")
        print("- pgAdmin: http://localhost:5050")
    elif all_ok and not models_ok:
        print(f"{Fore.YELLOW}⚠ System running in DEMO MODE{Style.RESET_ALL}")
        print("\nThe app is working but using simulated predictions.")
        print("Copy your model files to enable real predictions.")
    else:
        print(f"{Fore.RED}✗ Some components need attention{Style.RESET_ALL}")
        print("\nPlease fix the issues above and run this test again.")
    
    print("="*50 + "\n")

if __name__ == "__main__":
    main()