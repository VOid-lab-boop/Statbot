// API Route: /api/generate
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    return res.status(500).json({
      error: "API key not configured. Add ANTHROPIC_API_KEY in Vercel environment variables.",
    });
  }

  const { systemPrompt, userMessage } = req.body;

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ 
      error: "Missing systemPrompt or userMessage" 
    });
  }

  // Enhanced system prompt with comprehensive R package knowledge
  const enhancedSystemPrompt = systemPrompt + `

COMPREHENSIVE R PACKAGE LIBRARY:
You have access to ALL major R packages from CRAN. Install any package needed using if(!require(...)) install.packages(...).

Key packages by domain:

STRUCTURAL EQUATION MODELING & FACTOR ANALYSIS:
- lavaan: CFA, SEM, growth curves, WLSMV estimator, robust SE, modification indices
- semTools: extends lavaan with measurement invariance, reliability (omega, AVE), latent interactions
- psych: omega (ωₜ, ωₕ, ωₛ), alpha, EFA, fa(), principal(), ICC, Schmid-Leiman
- GPArotation: factor rotation methods (varimax, promax, oblimin)

ITEM RESPONSE THEORY:
- mirt: multidimensional IRT, 1PL/2PL/3PL/graded response models
- ltm: Rasch, 2PL, 3PL for binary/polytomous items
- TAM: Rasch models, multidimensional models, testlet models
- eRm: extended Rasch modeling, Rasch trees
- mokken: nonparametric IRT, Mokken scale analysis

MIXED/MULTILEVEL MODELS:
- lme4: lmer() for linear mixed models, glmer() for generalized, crossed/nested random effects
- nlme: lme() for mixed models with heteroscedasticity & correlated errors
- afex: ANOVA with mixed models, Type II/III tests
- emmeans: estimated marginal means, contrasts, post-hoc comparisons

REGRESSION & GLM:
- stats: lm(), glm(), aov(), anova()
- car: Anova() for Type II/III SS, vif(), linearHypothesis()
- MASS: polr() for ordinal regression, glm.nb() for negative binomial

DATA HANDLING:
- haven: read_sav() for SPSS .sav files, read_dta() for Stata, write_sav()
- readr: read_csv(), write_csv()
- dplyr: data manipulation (filter, select, mutate, group_by, summarize)
- tidyr: pivot_longer(), pivot_wider(), separate(), unite()

PSYCHOMETRICS & RELIABILITY:
- CTT: classical test theory functions
- psychometric: item analysis, reliability
- irr: inter-rater reliability (ICC, Kappa)

VISUALIZATION:
- ggplot2: publication-quality plots
- lattice: trellis graphics
- corrplot: correlation matrices

TIME SERIES:
- forecast: ARIMA, auto.arima(), ets()
- tseries: time series tests
- zoo: irregular time series

Use EXACT syntax from package documentation. For bifactor models use Rodriguez et al. (2016) formulas. For omega indices use McDonald (1999) definitions. Always check ?function_name for correct parameters.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096, // INCREASED from 2000 to fix code cutoff issue
        system: enhancedSystemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: errorData.error?.message || "Anthropic API error",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ 
      error: error.message || "Server error" 
    });
  }
}
