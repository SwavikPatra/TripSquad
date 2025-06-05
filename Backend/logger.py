import logging
import sys
from typing import Optional, Dict, Any

class SimpleLogger:
    def __init__(self) -> None:
        # Initialize with default settings
        self.logger = self._setup_console_logger()
        
    def _setup_console_logger(self) -> logging.Logger:
        """Configure and return a console logger"""
        logger = logging.getLogger("SIMPLE_LOG_HANDLER")
        logger.setLevel(logging.INFO)  # Default level
        
        # Clear existing handlers to avoid duplication
        if logger.handlers:
            for handler in logger.handlers:
                logger.removeHandler(handler)
        
        # Create console handler
        handler = logging.StreamHandler(sys.stdout)
        
        # Custom formatter
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Prevent propagation to root logger
        logger.propagate = False
        
        return logger
    
    def log_message(
        self,
        level: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        app: Optional[str] = None,
        time_taken: str = "N/A"
    ) -> None:
        """Log messages with contextual data"""
        print("Before logging")
        if data is None:
            data = {}
            
        try:
            # Prepare log data
            log_data = {
                "source": data.get("source", "N/A"),
                "appName": app or "N/A",
                "logid": data.get("logid", "N/A"),
                "client_ip_address": data.get("clientip", "N/A"),
                "client_username": data.get("username", "N/A"),
                "time_taken": time_taken,
                "custom_data": data.get("data", "N/A"),
            }
            
            # Map log levels
            log_functions = {
                "DEBUG": self.logger.debug,
                "INFO": self.logger.info,
                "WARN": self.logger.warning,
                "ERROR": self.logger.error,
                "CRITICAL": self.logger.critical,
            }
            
            level = level.upper()
            log_function = log_functions.get(level, self.logger.info)
            
            # Format the message with context
            formatted_message = f"{message} | {log_data}"
            log_function(formatted_message)
            
        except Exception as e:
            print(f"Logging failed: {str(e)}")
            self.logger.error(f"Failed to log message: {message}")

# Singleton logger instance
logger = SimpleLogger()