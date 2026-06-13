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
