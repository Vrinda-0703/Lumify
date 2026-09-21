import logoImg from "../../assets/logo.png";

export default function Logo({
    size = "default",
    showTagline = true,
    iconOnly = false,
    className = "",
}) {
    const isSmall = size === "small";
    const isLarge = size === "large";

    const iconDimension = isSmall ? 32 : isLarge ? 56 : 42;

    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            <div
                className="relative flex items-center justify-center shrink-0 transition-transform hover:scale-105"
                style={{
                    width: iconDimension,
                    height: iconDimension,
                }}
            >
                <img
                    src={logoImg}
                    alt="Lumify Logo"
                    className="w-full h-full object-contain filter drop-shadow-sm"
                    loading="eager"
                />
            </div>

            {!iconOnly && (
                <div className="leading-tight">
                    <div
                        className={`font-black tracking-tight flex items-center ${
                            isSmall ? "text-lg" : isLarge ? "text-3xl" : "text-xl"
                        }`}
                        style={{ color: "var(--text-primary)" }}
                    >
                        Lumify
                        <span
                            className="inline-block w-1.5 h-1.5 rounded-full ml-0.5"
                            style={{ background: "var(--accent)" }}
                        />
                    </div>
                    {showTagline && (
                        <p
                            className="m-0 tracking-[0.14em] uppercase font-bold"
                            style={{
                                fontSize: isSmall ? "8px" : isLarge ? "10px" : "9px",
                                color: "var(--accent)",
                            }}
                        >
                            See your money clearly.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
