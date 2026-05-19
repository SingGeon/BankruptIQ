FEATURE_COLUMNS = [
    "current_ratio",
    "quick_ratio",
    "debt_ratio",
    "debt_to_equity",
    "net_profit_margin",
    "return_on_assets",
    "return_on_equity",
    "asset_turnover",
    "working_capital_ratio",
    "interest_coverage",
]

FEATURE_DESCRIPTIONS = {
    "current_ratio": "Lichiditate curentă (active curente / datorii curente)",
    "quick_ratio": "Lichiditate rapidă (fără stocuri)",
    "debt_ratio": "Rata datoriilor (total datorii / total active)",
    "debt_to_equity": "Datorii / Capital propriu",
    "net_profit_margin": "Marja profit net (%)",
    "return_on_assets": "Rentabilitatea activelor — ROA (%)",
    "return_on_equity": "Rentabilitatea capitalului propriu — ROE (%)",
    "asset_turnover": "Rotația activelor (vânzări / total active)",
    "working_capital_ratio": "Fond de rulment / Total active",
    "interest_coverage": "Acoperirea dobânzilor (EBIT / Cheltuieli dobânzi)",
}
