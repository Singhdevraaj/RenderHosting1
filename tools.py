from google.genai import types


# ============================================================
# Actual Python functions
# ============================================================

def add(a: float, b: float) -> float:
    """Add two numbers."""
    return a + b


def product(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b


def subtract(a: float, b: float) -> float:
    """Subtract b from a."""
    return a - b


def divide(a: float, b: float) -> float:
    """Divide a by b."""
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b


def square(n: float) -> float:
    """Calculate the square of a number."""
    return n * n


def power(base: float, exponent: float) -> float:

    """Calculate base raised to the power of exponent."""
    return base ** exponent


def cube(n: float) -> float:
    """Calculate the cube of a number."""
    return n * n * n


def modulus(a: float, b: float) -> float:
    """Calculate the remainder of a divided by b."""
    if b == 0:
        raise ValueError("Cannot calculate modulus with divisor 0.")
    return a % b


def percentage(part: float, total: float) -> float:
    """Calculate what percentage part is of total."""
    if total == 0:
        raise ValueError("Total cannot be zero.")
    return (part / total) * 100.0


# ============================================================
# Gemini function declarations
# ============================================================

NUMBER_PAIR_PROPERTIES = {
    "a": types.Schema(type=types.Type.NUMBER),
    "b": types.Schema(type=types.Type.NUMBER),
}

NUMBER_PAIR_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties=NUMBER_PAIR_PROPERTIES,
    required=["a", "b"],
)


TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="add",
        description="Add two numbers together.",
        parameters=NUMBER_PAIR_SCHEMA,
    ),
    types.FunctionDeclaration(
        name="product",
        description="Multiply two numbers together.",
        parameters=NUMBER_PAIR_SCHEMA,
    ),
    types.FunctionDeclaration(
        name="subtract",
        description="Subtract the second number from the first.",
        parameters=NUMBER_PAIR_SCHEMA,
    ),
    types.FunctionDeclaration(
        name="divide",
        description="Divide the first number by the second.",
        parameters=NUMBER_PAIR_SCHEMA,
    ),
    types.FunctionDeclaration(
        name="square",
        description="Calculate the square of a number.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "n": types.Schema(type=types.Type.NUMBER),
            },
            required=["n"],
        ),
    ),
    types.FunctionDeclaration(
        name="power",
        description="Calculate base raised to the power of exponent.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "base": types.Schema(type=types.Type.NUMBER),
                "exponent": types.Schema(type=types.Type.NUMBER),
            },
            required=["base", "exponent"],
        ),
    ),
    types.FunctionDeclaration(
        name="cube",
        description="Calculate the cube of a number.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "n": types.Schema(type=types.Type.NUMBER),
            },
            required=["n"],
        ),
    ),
    types.FunctionDeclaration(
        name="modulus",
        description="Calculate the remainder of a divided by b.",
        parameters=NUMBER_PAIR_SCHEMA,
    ),
    types.FunctionDeclaration(
        name="percentage",
        description="Calculate what percentage part is of total.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "part": types.Schema(type=types.Type.NUMBER),
                "total": types.Schema(type=types.Type.NUMBER),
            },
            required=["part", "total"],
        ),
    ),
]


# ============================================================
# Tool registry
# ============================================================

AVAILABLE_FUNCTIONS = {
    "add": add,
    "product": product,
    "subtract": subtract,
    "divide": divide,
    "square": square,
    "power": power,
    "cube": cube,
    "modulus": modulus,
    "percentage": percentage,
}


def get_tools_info():
    """Return serializable metadata about all registered tools for Web UI API."""
    info = []
    for decl in TOOL_DECLARATIONS:
        func = AVAILABLE_FUNCTIONS.get(decl.name)
        params = {}
        if decl.parameters and decl.parameters.properties:
            for k, v in decl.parameters.properties.items():
                params[k] = {
                    "type": str(v.type).replace("Type.", "").lower() if v.type else "number",
                    "description": k
                }
        info.append({
            "name": decl.name,
            "description": decl.description or (func.__doc__ if func else ""),
            "parameters": params,
            "required": decl.parameters.required if decl.parameters else []
        })
    return info

