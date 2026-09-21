function Button({
    text,
    onClick,
    type = "button",
    className = "",
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`px-6 py-3 rounded-xl font-semibold transition duration-300 hover:scale-105 ${className}`}
        >
            {text}
        </button>
    );
}

export default Button;