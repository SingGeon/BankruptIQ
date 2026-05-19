import random
import csv
import sys

random.seed(42)

romanian_company_names = [
    "Construct SRL", "AgroRom SA", "TechPro SRL", "Metalurg SA", "TransRom SRL",
    "BioFarm SA", "ElectroTech SRL", "ForestProd SA", "MedServ SRL", "AutoParts SA",
    "ChimProd SRL", "AlimCom SA", "TextilRom SRL", "PetroChem SA", "LogisticPro SRL",
    "ImpexRom SA", "ConsTrans SRL", "AgroCoop SA", "SiderurgRom SRL", "FarmaCom SA",
    "RetailPro SRL", "EnergRom SA", "HidroTech SRL", "VinRom SA", "LemnArt SRL",
    "MobilCom SA", "PaperProd SRL", "CementRom SA", "PlastTech SRL", "AlimFresh SA",
    "TurisRom SRL", "InfoSys SA", "MedTech SRL", "CargoTrans SA", "AgriProd SRL",
    "SteelRom SA", "ChimFarm SRL", "EuroTrans SA", "ElectroCom SRL", "BioRom SA",
    "ConstructPro SA", "GrandeRom SRL", "ServTech SA", "AgroVerde SRL", "MetalCom SA",
    "TransEuro SRL", "FarmaBio SA", "TechSys SRL", "IndustrRom SA", "ComercRom SRL",
]

bankrupt_company_names = [
    "VecheCorp SRL", "DatornicSA SA", "CrizaFirm SRL", "InsolvCo SA", "FailTech SRL",
    "DebitRom SA", "PierdereProd SRL", "RuinaCom SA", "LichidRom SRL", "FalimentSA SA",
    "NegativProfit SRL", "DeclincoCo SA", "CaderiRom SA", "PasivExces SA", "DeficitProd SRL",
    "ColapsRom SA", "InsolvServ SRL", "BancrotCo SA", "PierdeTotal SA", "CrizaMax SRL",
    "NegCash SA", "DeficitCom SRL", "RuinaFirm SA", "FalimCorp SRL", "CadereRom SA",
]

def gen_healthy():
    current_ratio = round(random.uniform(1.2, 3.0), 4)
    quick_ratio = round(random.uniform(0.8, min(current_ratio, 2.5)), 4)
    debt_ratio = round(random.uniform(0.2, 0.55), 4)
    debt_to_equity = round(random.uniform(0.3, 1.5), 4)
    net_profit_margin = round(random.uniform(2.0, 25.0), 4)
    return_on_assets = round(random.uniform(1.0, 18.0), 4)
    return_on_equity = round(random.uniform(3.0, 30.0), 4)
    asset_turnover = round(random.uniform(0.5, 2.5), 4)
    working_capital_ratio = round(random.uniform(0.05, 0.4), 4)
    interest_coverage = round(random.uniform(2.0, 15.0), 4)
    return (current_ratio, quick_ratio, debt_ratio, debt_to_equity,
            net_profit_margin, return_on_assets, return_on_equity,
            asset_turnover, working_capital_ratio, interest_coverage)

def gen_bankrupt():
    current_ratio = round(random.uniform(0.3, 0.95), 4)
    quick_ratio = round(random.uniform(0.2, min(current_ratio, 0.8)), 4)
    debt_ratio = round(random.uniform(0.75, 1.5), 4)
    debt_to_equity = round(random.uniform(3.0, 20.0), 4)
    net_profit_margin = round(random.uniform(-40.0, -2.0), 4)
    return_on_assets = round(random.uniform(-25.0, -1.0), 4)
    return_on_equity = round(random.uniform(-60.0, -5.0), 4)
    asset_turnover = round(random.uniform(0.1, 0.8), 4)
    working_capital_ratio = round(random.uniform(-0.5, -0.05), 4)
    interest_coverage = round(random.uniform(-5.0, 0.8), 4)
    return (current_ratio, quick_ratio, debt_ratio, debt_to_equity,
            net_profit_margin, return_on_assets, return_on_equity,
            asset_turnover, working_capital_ratio, interest_coverage)

rows = []

# 55 healthy rows
healthy_pool = list(romanian_company_names)
random.shuffle(healthy_pool)
for i in range(55):
    name = healthy_pool[i % len(healthy_pool)]
    year = random.randint(2018, 2023)
    financials = gen_healthy()
    rows.append((name, year) + financials + (0,))

# 25 bankrupt rows
bankrupt_pool = list(bankrupt_company_names)
random.shuffle(bankrupt_pool)
for i in range(25):
    name = bankrupt_pool[i % len(bankrupt_pool)]
    year = random.randint(2018, 2023)
    financials = gen_bankrupt()
    rows.append((name, year) + financials + (1,))

random.shuffle(rows)

writer = csv.writer(sys.stdout, lineterminator='\n')
writer.writerow([
    "company_name", "year", "current_ratio", "quick_ratio", "debt_ratio",
    "debt_to_equity", "net_profit_margin", "return_on_assets", "return_on_equity",
    "asset_turnover", "working_capital_ratio", "interest_coverage", "is_bankrupt"
])
for row in rows:
    writer.writerow(row)
