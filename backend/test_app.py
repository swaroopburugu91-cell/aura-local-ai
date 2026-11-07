import sys
try:
    from app.main import app
    print("SUCCESS: FastAPI app loaded successfully with all routes registered!")
    print(f"Routes: {[route.path for route in app.routes]}")
except Exception as e:
    print("ERROR:", e)
    sys.exit(1)
