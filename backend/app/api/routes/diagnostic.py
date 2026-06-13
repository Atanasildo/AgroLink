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


@router.get("/vehicles-columns", tags=["Diagnóstico"])
def diagnostic_vehicles_columns(db: Session = Depends(get_db)):
    """Lista as colunas da tabela vehicles."""
    try:
        result = db.execute(
            text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'vehicles'
            ORDER BY ordinal_position
            """)
        ).fetchall()
        return {
            "status": "ok",
            "columns": [{"name": r[0], "type": r[1], "nullable": r[2], "default": r[3]} for r in result],
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/transport-error", tags=["Diagnóstico"])
def diagnostic_transport_error(db: Session = Depends(get_db)):
    """Tenta fazer o mesmo que /transport/routes para capturar o erro real."""
    try:
        from sqlalchemy import text as t
        result = db.execute(t("SELECT * FROM transport_routes LIMIT 1")).fetchall()
        return {"status": "ok", "rows": len(result)}
    except Exception as e:
        return {"status": "error", "error": str(e), "type": type(e).__name__}


@router.get("/transport-orm", tags=["Diagnóstico"])
def diagnostic_transport_orm(db: Session = Depends(get_db)):
    """Tenta carregar transport_routes via ORM para capturar erro real."""
    try:
        from app.models.transport_route import TransportRoute
        routes = db.query(TransportRoute).limit(1).all()
        return {"status": "ok", "count": len(routes)}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "type": type(e).__name__, "trace": traceback.format_exc()}


@router.get("/vehicle-orm", tags=["Diagnóstico"])
def diagnostic_vehicle_orm(db: Session = Depends(get_db)):
    """Tenta carregar vehicles via ORM para capturar erro real."""
    try:
        from app.models.vehicle import Vehicle
        v = db.query(Vehicle).limit(1).all()
        return {"status": "ok", "count": len(v)}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "type": type(e).__name__, "trace": traceback.format_exc()}
