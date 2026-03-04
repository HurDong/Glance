package com.glance.domain.stocks.utils;

public class MarketUtils {
    /**
     * Determines whether the given symbol belongs to the global market (e.g., US
     * stocks, Crypto)
     * or the domestic (Korean) market.
     * 
     * @param symbol The ticker symbol
     * @return true if the symbol is global (e.g., AAPL, BINANCE:BTCUSDT), false if
     *         Korean (e.g., 005930, Q530140).
     */
    public static boolean isGlobalSymbol(String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) {
            return false;
        }

        // Cryptocurrency or Forex symbols (like OANDA:USD_KRW, BINANCE:BTCUSDT)
        if (symbol.contains(":")) {
            return true;
        }

        // Korean stocks/ETFs are standard 6 digits or 1 letter followed by exactly 5-6
        // digits
        // Example: 005930 (Samsung), A005930 (Standard Code Prefix), Q530140 (Kodex US
        // ETF code)
        if (symbol.matches("^[a-zA-Z]?\\d{5,6}$")) {
            return false;
        }

        // Otherwise, if it starts with an alphabetic character, assume it's a global/US
        // stock (e.g., AAPL, TSLA)
        return symbol.matches("^[a-zA-Z].*");
    }
}
