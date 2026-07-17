import re

with open('routes.ts', 'r') as f:
    routes = f.read()

# Replace the catch blocks in GET routes
routes = re.sub(
    r'    } catch \(e\) \{\n      next\(e\);\n    \}',
    r'''    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }''',
    routes
)

with open('routes.ts', 'w') as f:
    f.write(routes)
