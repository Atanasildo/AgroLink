"""Rota de seed — apenas em ambiente de desenvolvimento/staging.

Popula a base de dados com utilizadores, veículos, rotas de transporte
e máquinas de exemplo para facilitar testes.
"""
import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.machine import Machine, MachineType
from app.models.transport_route import TransportRoute
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleType

router = APIRouter(prefix="/seed", tags=["Seed"])

PROVINCIAS = ["Luanda", "Huambo", "Bié", "Malanje", "Uíge", "Benguela", "Cuanza Sul"]
MUNICIPIOS = {
    "Luanda": ["Luanda", "Cacuaco", "Viana", "Kilamba Kiaxi"],
    "Huambo": ["Huambo", "Caála", "Catchiungo", "Longonjo"],
    "Bié": ["Kuito", "Camacupa", "Chinguar", "Nharea"],
    "Malanje": ["Malanje", "Calandula", "Cacuso"],
    "Uíge": ["Uíge", "Negage", "Quimbele"],
    "Benguela": ["Benguela", "Lobito", "Balombo"],
    "Cuanza Sul": ["Sumbe", "Amboim", "Ebo"],
}


def _prov_mun():
    p = random.choice(PROVINCIAS)
    m = random.choice(MUNICIPIOS[p])
    return p, m


@router.post("/", status_code=status.HTTP_201_CREATED)
def seed_database(db: Session = Depends(get_db)):
    """Insere dados de exemplo. Idempotente — não duplica se o seed já existir."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seed desativado em produção.",
        )

    # Verifica se já existe seed
    if db.query(User).filter(User.email == "seed.agricultor@agrolink.ao").first():
        return {"detail": "Seed já aplicado.", "seeded": False}

    pw = hash_password("Agrolink@2026")

    # --- Utilizadores ---
    agricultor = User(nome="Manuel Kaholo", email="seed.agricultor@agrolink.ao",
                      hashed_password=pw, role=UserRole.AGRICULTOR,
                      provincia="Huambo", municipio="Caála",
                      bio="Agricultor de milho e feijão no Planalto Central.")
    comprador = User(nome="Ana Ferreira", email="seed.comprador@agrolink.ao",
                     hashed_password=pw, role=UserRole.COMPRADOR,
                     provincia="Luanda", municipio="Luanda")
    transportador = User(nome="Pedro Lopes", email="seed.transportador@agrolink.ao",
                         hashed_password=pw, role=UserRole.TRANSPORTADOR,
                         provincia="Huambo", municipio="Huambo",
                         bio="Transportador com 10 anos de experiência em logística rural.")
    proprietario = User(nome="Sofia Nzinga", email="seed.proprietario@agrolink.ao",
                        hashed_password=pw, role=UserRole.PROPRIETARIO_MAQUINAS,
                        provincia="Bié", municipio="Kuito",
                        bio="Proprietária de tratores e colheitadeiras para aluguel.")

    db.add_all([agricultor, comprador, transportador, proprietario])
    db.flush()  # gera IDs sem commit

    # --- Veículos ---
    veiculos = [
        Vehicle(proprietario_id=transportador.id, tipo=VehicleType.CAMINHAO,
                matricula="LD-12-34-AB", capacidade_toneladas=10),
        Vehicle(proprietario_id=transportador.id, tipo=VehicleType.CARRINHA,
                matricula="HB-56-78-CD", capacidade_toneladas=3),
        Vehicle(proprietario_id=transportador.id, tipo=VehicleType.CAMINHAO,
                matricula="BI-90-12-EF", capacidade_toneladas=15),
    ]
    db.add_all(veiculos)
    db.flush()

    # --- Rotas de transporte ---
    pares = [
        ("Caála, Huambo", "Luanda"),
        ("Kuito, Bié", "Luanda"),
        ("Malanje", "Luanda"),
        ("Uíge", "Luanda"),
        ("Benguela", "Luanda"),
        ("Huambo", "Benguela"),
        ("Kuito, Bié", "Huambo"),
    ]
    rotas = []
    for i, (origem, destino) in enumerate(pares):
        data = date.today() + timedelta(days=random.randint(1, 14))
        cap = round(random.uniform(5, 15), 2)
        rotas.append(TransportRoute(
            veiculo_id=veiculos[i % len(veiculos)].id,
            transportador_id=transportador.id,
            origem=origem,
            destino=destino,
            data=data,
            preco_por_tonelada=round(random.uniform(3000, 8000), 2),
            capacidade_total_toneladas=cap,
            capacidade_disponivel_toneladas=cap,
        ))
    db.add_all(rotas)

    # --- Máquinas ---
    tipos_maquinas = [
        (MachineType.TRATOR, "Trator John Deere 5075E", "Trator 75CV ideal para lavra e preparação do solo."),
        (MachineType.COLHEITADEIRA, "Colheitadeira New Holland TC5060", "Colheitadeira para cereais com cabina climatizada."),
        (MachineType.PULVERIZADOR, "Pulverizador Jacto Uniport 2500", "Pulverizador autopropelido de alta precisão."),
        (MachineType.ARADO, "Arado de Disco Baldan", "Arado de 4 discos para solos argilosos."),
        (MachineType.SISTEMA_IRRIGACAO, "Sistema de Irrigação por Gotejamento", "Kit completo para 5 hectares."),
    ]
    maquinas = []
    for tipo, nome, desc in tipos_maquinas:
        p, m = _prov_mun()
        maquinas.append(Machine(
            proprietario_id=proprietario.id,
            tipo=tipo,
            nome=nome,
            descricao=desc,
            valor_diario=round(random.uniform(5000, 25000), 2),
            provincia=p,
            municipio=m,
        ))
    db.add_all(maquinas)

    db.commit()
    return {
        "detail": "Seed aplicado com sucesso!",
        "seeded": True,
        "utilizadores_criados": ["seed.agricultor@agrolink.ao", "seed.comprador@agrolink.ao",
                                  "seed.transportador@agrolink.ao", "seed.proprietario@agrolink.ao"],
        "senha_padrao": "Agrolink@2026",
        "rotas_criadas": len(rotas),
        "maquinas_criadas": len(maquinas),
    }
