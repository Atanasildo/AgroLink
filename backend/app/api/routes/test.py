"""Rota de teste simples para debugar máquinas."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/test", tags=["Test"])


@router.get("/machines-count")
def test_machines_count(db: Session = Depends(get_db)):
    """Conta simples de máquinas na BD."""
    try:
        from app.models.machine import Machine
        count = db.query(Machine).count()
        return {"status": "ok", "machines_count": count}
    except Exception as e:
        return {"status": "error", "error": str(e), "type": type(e).__name__}


@router.get("/raw-sql")
def test_raw_sql(db: Session = Depends(get_db)):
    """Query SQL pura — sem models."""
    try:
        from sqlalchemy import text
        
        # Teste 1: Contar
        count = db.execute(text("SELECT COUNT(*) FROM machines")).scalar()
        
        # Teste 2: Listar colunas
        columns = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'machines'
            ORDER BY ordinal_position
        """)).fetchall()
        
        # Teste 3: Primeira máquina (sem joins)
        machine = db.execute(text("""
            SELECT id, nome, tipo, preco_diaria 
            FROM machines 
            LIMIT 1
        """)).fetchone()
        
        return {
            "status": "ok",
            "machines_count": count,
            "columns": [{"name": c[0], "type": c[1]} for c in columns],
            "first_machine": {
                "id": str(machine[0]) if machine else None,
                "nome": machine[1] if machine else None,
                "tipo": machine[2] if machine else None,
                "preco_diaria": str(machine[3]) if machine else None,
            } if machine else None,
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc(),
        }
def test_machines_ids(db: Session = Depends(get_db)):
    """Apenas IDs e nomes das máquinas (teste minimalista)."""
    try:
        from app.models.machine import Machine
        from sqlalchemy import text
        
        # Query muito simples sem joins
        result = db.execute(text("SELECT id, nome FROM machines LIMIT 10"))
        machines = result.fetchall()
        
        return {
            "status": "ok",
            "count": len(machines),
            "machines": [{"id": str(m[0]), "nome": m[1]} for m in machines],
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc(),
        }


@router.get("/machines-raw")
def test_machines_raw(db: Session = Depends(get_db)):
    """Retorna máquinas brutas sem serialização."""
    try:
        from app.models.machine import Machine
        machines = db.query(Machine).limit(5).all()
        return {
            "status": "ok",
            "count": len(machines),
            "machines": [
                {
                    "id": str(m.id),
                    "nome": m.nome,
                    "tipo": m.tipo,
                    "preco_diaria": str(m.preco_diaria),
                    "proprietario_id": str(m.proprietario_id),
                }
                for m in machines
            ],
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "type": type(e).__name__}
