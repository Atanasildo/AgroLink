"""Rota de diagnóstico — ajuda a identificar problemas no backend."""
import sys
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/diagnostic", tags=["Diagnóstico"])


@router.get("/health", tags=["Status"])
def diagnostic_health():
    """Health check simples."""
    return {"status": "ok", "version": "0.1.0"}


@router.get("/db", tags=["Diagnóstico"])
def diagnostic_db(db: Session = Depends(get_db)):
    """Testa conexão à base de dados."""
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {
            "status": "ok",
            "database": "PostgreSQL",
            "connection": "active",
            "test_query": result,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__,
        }


@router.get("/tables", tags=["Diagnóstico"])
def diagnostic_tables(db: Session = Depends(get_db)):
    """Lista todas as tabelas na base de dados."""
    try:
        result = db.execute(
            text(
                """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
            """
            )
        ).fetchall()
        return {
            "status": "ok",
            "tables": [row[0] for row in result],
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


@router.get("/users-count", tags=["Diagnóstico"])
def diagnostic_users_count(db: Session = Depends(get_db)):
    """Conta o número de utilizadores na BD."""
    try:
        count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        return {"status": "ok", "users_count": count}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/ratings-count", tags=["Diagnóstico"])
def diagnostic_ratings_count(db: Session = Depends(get_db)):
    """Testa a rota de ratings diretamente."""
    try:
        count = db.execute(text("SELECT COUNT(*) FROM ratings")).scalar()
        return {"status": "ok", "ratings_count": count}
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__,
        }


@router.get("/python-version", tags=["Diagnóstico"])
def diagnostic_python():
    """Informações do Python."""
    return {
        "python_version": sys.version,
        "python_implementation": sys.implementation.name,
    }
