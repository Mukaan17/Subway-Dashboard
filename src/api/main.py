# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-10 23:44:37
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-12 16:11:22
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MTA Real-Time Data API",
    version="1.0.0",
    description="API for accessing MTA real-time data including vehicle locations, service alerts, and elevator/escalator status."
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router with a prefix
app.include_router(router, prefix="/api")

# Root endpoint redirects to API docs
@app.get("/")
def read_root():
    """
    Redirect to API documentation.
    """
    return {
        "message": "MTA Real-Time Data API",
        "version": "1.0.0",
        "docs": "/docs",
        "api_base": "/api"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 