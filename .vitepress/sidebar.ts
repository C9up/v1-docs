// Generated from the docs reorganisation (one page per subject, by topic).
// Edit freely: it is plain data, read by config.ts.

export const nav_en = [
  {
    "text": "Start",
    "link": "/en/start/introduction",
    "activeMatch": "^/en/start/"
  },
  {
    "text": "Guides",
    "link": "/en/guides/basics/routing",
    "activeMatch": "^/en/guides/"
  },
  {
    "text": "Reference",
    "link": "/en/reference/errors",
    "activeMatch": "^/en/(reference|nebula)/"
  }
]

export const sidebar_en = {
  "/en/start/": [
    {
      "text": "Start",
      "items": [
        {
          "text": "Introduction",
          "link": "/en/start/introduction"
        },
        {
          "text": "Installation",
          "link": "/en/start/installation"
        },
        {
          "text": "Tutorial",
          "link": "/en/start/tutorial"
        },
        {
          "text": "Folder structure",
          "link": "/en/start/folder-structure"
        },
        {
          "text": "Configuration",
          "link": "/en/start/configuration"
        },
        {
          "text": "The packages",
          "link": "/en/start/packages"
        },
        {
          "text": "Coming from AdonisJS",
          "link": "/en/start/coming-from-adonisjs"
        }
      ]
    }
  ],
  "/en/guides/": [
    {
      "text": "Basics",
      "collapsed": false,
      "items": [
        {
          "text": "Routing",
          "link": "/en/guides/basics/routing"
        },
        {
          "text": "Controllers",
          "link": "/en/guides/basics/controllers"
        },
        {
          "text": "HTTP context",
          "link": "/en/guides/basics/http-context"
        },
        {
          "text": "Middleware",
          "link": "/en/guides/basics/middleware"
        },
        {
          "text": "Request",
          "link": "/en/guides/basics/request"
        },
        {
          "text": "Response",
          "link": "/en/guides/basics/response"
        },
        {
          "text": "Body parser",
          "link": "/en/guides/basics/body-parser"
        },
        {
          "text": "Validation",
          "collapsed": true,
          "items": [
            {
              "text": "Rules",
              "link": "/en/guides/basics/validation/rules"
            },
            {
              "text": "Custom rules",
              "link": "/en/guides/basics/validation/custom-rules"
            },
            {
              "text": "Error messages and i18n",
              "link": "/en/guides/basics/validation/messages"
            },
            {
              "text": "Async validation",
              "link": "/en/guides/basics/validation/async"
            },
            {
              "text": "JSON Schema",
              "link": "/en/guides/basics/validation/json-schema"
            }
          ],
          "link": "/en/guides/basics/validation/"
        },
        {
          "text": "File uploads",
          "link": "/en/guides/basics/file-uploads"
        },
        {
          "text": "URL builder and signed URLs",
          "link": "/en/guides/basics/url-builder"
        },
        {
          "text": "Exception handling",
          "link": "/en/guides/basics/exception-handling"
        },
        {
          "text": "Static files",
          "link": "/en/guides/basics/static-files"
        }
      ]
    },
    {
      "text": "APIs",
      "collapsed": false,
      "items": [
        {
          "text": "JSON-RPC",
          "link": "/en/guides/apis/json-rpc"
        },
        {
          "text": "JSON-RPC clients",
          "link": "/en/guides/apis/json-rpc-clients"
        },
        {
          "text": "GraphQL",
          "link": "/en/guides/apis/graphql"
        },
        {
          "text": "OpenAPI",
          "link": "/en/guides/apis/openapi"
        },
        {
          "text": "API resources",
          "link": "/en/guides/apis/resources"
        }
      ]
    },
    {
      "text": "Frontend",
      "collapsed": false,
      "items": [
        {
          "text": "Templates",
          "collapsed": true,
          "items": [
            {
              "text": "Layouts and components",
              "link": "/en/guides/frontend/templates/layouts"
            },
            {
              "text": "Helpers and custom tags",
              "link": "/en/guides/frontend/templates/extending"
            }
          ],
          "link": "/en/guides/frontend/templates/"
        },
        {
          "text": "Aurora",
          "collapsed": true,
          "items": [
            {
              "text": "Templates",
              "link": "/en/guides/frontend/aurora/templates"
            },
            {
              "text": "Signals",
              "link": "/en/guides/frontend/aurora/signals"
            },
            {
              "text": "Server rendering",
              "link": "/en/guides/frontend/aurora/server-rendering"
            },
            {
              "text": "Shared pages",
              "link": "/en/guides/frontend/aurora/shared-pages"
            },
            {
              "text": "Browser helpers",
              "link": "/en/guides/frontend/aurora/browser"
            },
            {
              "text": "Forms and actions",
              "link": "/en/guides/frontend/aurora/forms"
            },
            {
              "text": "Live components",
              "link": "/en/guides/frontend/aurora/live"
            }
          ],
          "link": "/en/guides/frontend/aurora/"
        },
        {
          "text": "Server-driven pages",
          "collapsed": true,
          "items": [
            {
              "text": "Pages and props",
              "link": "/en/guides/frontend/photon/pages"
            },
            {
              "text": "Frameworks",
              "link": "/en/guides/frontend/photon/frameworks"
            },
            {
              "text": "Hydration and navigation",
              "link": "/en/guides/frontend/photon/hydration"
            },
            {
              "text": "Head, SEO and CSP",
              "link": "/en/guides/frontend/photon/head"
            }
          ],
          "link": "/en/guides/frontend/photon/"
        },
        {
          "text": "Vite",
          "link": "/en/guides/frontend/vite"
        },
        {
          "text": "Tailwind CSS",
          "link": "/en/guides/frontend/tailwind"
        },
        {
          "text": "Structured data",
          "link": "/en/guides/frontend/structured-data"
        },
        {
          "text": "Components (nebula)",
          "link": "/en/nebula/"
        }
      ]
    },
    {
      "text": "Data layer",
      "collapsed": false,
      "items": [
        {
          "text": "SQL ORM",
          "collapsed": true,
          "items": [
            {
              "text": "Getting started",
              "link": "/en/guides/database/orm/getting-started"
            },
            {
              "text": "Entities",
              "link": "/en/guides/database/orm/entities"
            },
            {
              "text": "Active record",
              "link": "/en/guides/database/orm/active-record"
            },
            {
              "text": "Relations",
              "link": "/en/guides/database/orm/relations"
            },
            {
              "text": "Query builder",
              "link": "/en/guides/database/orm/query-builder"
            },
            {
              "text": "Advanced queries",
              "link": "/en/guides/database/orm/advanced-queries"
            },
            {
              "text": "Pagination and reads",
              "link": "/en/guides/database/orm/pagination-and-reads"
            },
            {
              "text": "Transactions and locks",
              "link": "/en/guides/database/orm/transactions-and-locks"
            },
            {
              "text": "Repositories",
              "link": "/en/guides/database/orm/repositories"
            },
            {
              "text": "Lifecycle hooks",
              "link": "/en/guides/database/orm/lifecycle-hooks"
            },
            {
              "text": "Migrations",
              "link": "/en/guides/database/orm/migrations"
            },
            {
              "text": "Writing migrations",
              "link": "/en/guides/database/orm/writing-migrations"
            },
            {
              "text": "Schema builder",
              "link": "/en/guides/database/orm/schema-builder"
            },
            {
              "text": "Columns and indexes",
              "link": "/en/guides/database/orm/columns-and-indexes"
            },
            {
              "text": "Constraints",
              "link": "/en/guides/database/orm/constraints"
            },
            {
              "text": "Schema dump and verification",
              "link": "/en/guides/database/orm/schema-dump"
            },
            {
              "text": "Seeders",
              "link": "/en/guides/database/orm/seeders"
            },
            {
              "text": "Factories",
              "link": "/en/guides/database/orm/factories"
            },
            {
              "text": "Connections",
              "link": "/en/guides/database/orm/connections"
            },
            {
              "text": "Dialects",
              "link": "/en/guides/database/orm/dialects"
            },
            {
              "text": "Provider and boot",
              "link": "/en/guides/database/orm/provider"
            },
            {
              "text": "Domain events",
              "link": "/en/guides/database/orm/domain-events"
            },
            {
              "text": "SQL security",
              "link": "/en/guides/database/orm/security"
            },
            {
              "text": "Performance",
              "link": "/en/guides/database/orm/performance"
            },
            {
              "text": "Observability",
              "link": "/en/guides/database/orm/observability"
            },
            {
              "text": "Error handling",
              "link": "/en/guides/database/orm/error-handling"
            },
            {
              "text": "Recipes",
              "link": "/en/guides/database/orm/recipes"
            },
            {
              "text": "Troubleshooting",
              "link": "/en/guides/database/orm/troubleshooting"
            }
          ],
          "link": "/en/guides/database/orm/"
        },
        {
          "text": "Redis",
          "link": "/en/guides/database/redis"
        },
        {
          "text": "Time series",
          "collapsed": true,
          "items": [
            {
              "text": "Schema and migrations",
              "link": "/en/guides/database/time-series/schema"
            },
            {
              "text": "Writing and reading",
              "link": "/en/guides/database/time-series/data"
            },
            {
              "text": "Testing",
              "link": "/en/guides/database/time-series/testing"
            }
          ],
          "link": "/en/guides/database/time-series/"
        }
      ]
    },
    {
      "text": "Auth",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/en/guides/auth/introduction"
        },
        {
          "text": "Verifying credentials",
          "link": "/en/guides/auth/verifying-credentials"
        },
        {
          "text": "Session guard",
          "link": "/en/guides/auth/session-guard"
        },
        {
          "text": "Access tokens guard",
          "link": "/en/guides/auth/access-tokens-guard"
        },
        {
          "text": "JWT guard",
          "link": "/en/guides/auth/jwt-guard"
        },
        {
          "text": "Basic auth guard",
          "link": "/en/guides/auth/basic-auth-guard"
        },
        {
          "text": "Custom guard",
          "link": "/en/guides/auth/custom-guard"
        },
        {
          "text": "Protecting routes",
          "link": "/en/guides/auth/protecting-routes"
        },
        {
          "text": "Multi-factor authentication",
          "link": "/en/guides/auth/mfa"
        },
        {
          "text": "Authorization",
          "collapsed": true,
          "items": [
            {
              "text": "Rights (RBAC and ACL)",
              "link": "/en/guides/auth/authorization/rights"
            },
            {
              "text": "Evaluating abilities",
              "link": "/en/guides/auth/authorization/bouncer"
            }
          ],
          "link": "/en/guides/auth/authorization/"
        },
        {
          "text": "Social authentication",
          "collapsed": true,
          "items": [
            {
              "text": "Providers",
              "link": "/en/guides/auth/social/providers"
            },
            {
              "text": "OpenID Connect",
              "link": "/en/guides/auth/social/oidc"
            },
            {
              "text": "SAML 2.0",
              "link": "/en/guides/auth/social/saml"
            },
            {
              "text": "LDAP and Active Directory",
              "link": "/en/guides/auth/social/ldap"
            },
            {
              "text": "Testing and custom drivers",
              "link": "/en/guides/auth/social/testing"
            }
          ],
          "link": "/en/guides/auth/social/"
        }
      ]
    },
    {
      "text": "OAuth server",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/en/guides/oauth-server/introduction"
        },
        {
          "text": "Authorization endpoint and clients",
          "link": "/en/guides/oauth-server/authorize"
        },
        {
          "text": "Protecting resources",
          "link": "/en/guides/oauth-server/resources"
        },
        {
          "text": "Issuer and store",
          "link": "/en/guides/oauth-server/issuer-and-store"
        },
        {
          "text": "Testing",
          "link": "/en/guides/oauth-server/testing"
        }
      ]
    },
    {
      "text": "Security",
      "collapsed": false,
      "items": [
        {
          "text": "Hashing",
          "link": "/en/guides/security/hashing"
        },
        {
          "text": "Encryption",
          "link": "/en/guides/security/encryption"
        },
        {
          "text": "CORS",
          "link": "/en/guides/security/cors"
        },
        {
          "text": "Securing server-rendered apps",
          "link": "/en/guides/security/securing-ssr"
        },
        {
          "text": "CSRF protection",
          "link": "/en/guides/security/csrf"
        },
        {
          "text": "XSS sanitization",
          "link": "/en/guides/security/xss"
        },
        {
          "text": "Rate limiting",
          "link": "/en/guides/security/rate-limiting"
        },
        {
          "text": "Production checklist",
          "link": "/en/guides/security/production"
        }
      ]
    },
    {
      "text": "Realtime",
      "collapsed": false,
      "items": [
        {
          "text": "WebSockets",
          "link": "/en/guides/realtime/websockets"
        },
        {
          "text": "Broadcasting",
          "link": "/en/guides/realtime/broadcasting"
        },
        {
          "text": "Hubs",
          "link": "/en/guides/realtime/hubs"
        }
      ]
    },
    {
      "text": "Mobile",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/en/guides/mobile/introduction"
        },
        {
          "text": "Styles and screens",
          "link": "/en/guides/mobile/styles-and-screens"
        },
        {
          "text": "Server-driven pages",
          "link": "/en/guides/mobile/server-driven"
        },
        {
          "text": "Device APIs",
          "link": "/en/guides/mobile/device-apis"
        },
        {
          "text": "Gestures and motion",
          "link": "/en/guides/mobile/gestures-and-motion"
        },
        {
          "text": "Building the app",
          "link": "/en/guides/mobile/building"
        }
      ]
    },
    {
      "text": "Core concepts",
      "collapsed": false,
      "items": [
        {
          "text": "Application",
          "link": "/en/guides/concepts/application"
        },
        {
          "text": "Application lifecycle",
          "link": "/en/guides/concepts/lifecycle"
        },
        {
          "text": "Dependency injection",
          "link": "/en/guides/concepts/dependency-injection"
        },
        {
          "text": "Providers",
          "link": "/en/guides/concepts/providers"
        },
        {
          "text": "Extending ream",
          "link": "/en/guides/concepts/extending"
        },
        {
          "text": "The Codemods API",
          "link": "/en/guides/concepts/codemods"
        },
        {
          "text": "A worked example",
          "link": "/en/guides/concepts/plugin-example"
        },
        {
          "text": "Publishing packages",
          "link": "/en/guides/concepts/publishing"
        }
      ]
    },
    {
      "text": "Digging deeper",
      "collapsed": false,
      "items": [
        {
          "text": "Cache",
          "link": "/en/guides/digging-deeper/cache"
        },
        {
          "text": "Drive",
          "link": "/en/guides/digging-deeper/drive"
        },
        {
          "text": "Emitter",
          "link": "/en/guides/digging-deeper/emitter"
        },
        {
          "text": "Health checks",
          "link": "/en/guides/digging-deeper/health-checks"
        },
        {
          "text": "HTTP client",
          "link": "/en/guides/digging-deeper/http-client"
        },
        {
          "text": "I18n",
          "link": "/en/guides/digging-deeper/i18n"
        },
        {
          "text": "Atomic locks",
          "link": "/en/guides/digging-deeper/locks"
        },
        {
          "text": "Logger",
          "collapsed": true,
          "items": [
            {
              "text": "Channels and transports",
              "link": "/en/guides/digging-deeper/logger/channels"
            },
            {
              "text": "Configuration",
              "link": "/en/guides/digging-deeper/logger/configuration"
            }
          ],
          "link": "/en/guides/digging-deeper/logger/"
        },
        {
          "text": "Mail",
          "collapsed": true,
          "items": [
            {
              "text": "Messages",
              "link": "/en/guides/digging-deeper/mail/messages"
            },
            {
              "text": "Transports",
              "link": "/en/guides/digging-deeper/mail/transports"
            },
            {
              "text": "Queues and events",
              "link": "/en/guides/digging-deeper/mail/queues-and-events"
            }
          ],
          "link": "/en/guides/digging-deeper/mail/"
        },
        {
          "text": "Queues",
          "link": "/en/guides/digging-deeper/queues"
        },
        {
          "text": "Scheduling",
          "link": "/en/guides/digging-deeper/scheduling"
        },
        {
          "text": "Push notifications",
          "collapsed": true,
          "items": [
            {
              "text": "Subscribing and sending",
              "link": "/en/guides/digging-deeper/push/sending"
            },
            {
              "text": "Service worker",
              "link": "/en/guides/digging-deeper/push/service-worker"
            },
            {
              "text": "Stores and testing",
              "link": "/en/guides/digging-deeper/push/stores-and-testing"
            }
          ],
          "link": "/en/guides/digging-deeper/push/"
        },
        {
          "text": "Metrics and OpenTelemetry",
          "link": "/en/guides/digging-deeper/metrics"
        },
        {
          "text": "Images",
          "collapsed": true,
          "items": [
            {
              "text": "QR codes",
              "link": "/en/guides/digging-deeper/images/qr-codes"
            },
            {
              "text": "Serving images",
              "link": "/en/guides/digging-deeper/images/serving"
            },
            {
              "text": "Formats and colour",
              "link": "/en/guides/digging-deeper/images/formats"
            },
            {
              "text": "Safety and testing",
              "link": "/en/guides/digging-deeper/images/safety"
            }
          ],
          "link": "/en/guides/digging-deeper/images/"
        },
        {
          "text": "PDF",
          "collapsed": true,
          "items": [
            {
              "text": "Reading and editing",
              "link": "/en/guides/digging-deeper/pdf/editing"
            },
            {
              "text": "Forms",
              "link": "/en/guides/digging-deeper/pdf/forms"
            },
            {
              "text": "Signing",
              "link": "/en/guides/digging-deeper/pdf/signing"
            },
            {
              "text": "Generating documents",
              "link": "/en/guides/digging-deeper/pdf/documents"
            },
            {
              "text": "Text and fonts",
              "link": "/en/guides/digging-deeper/pdf/documents-text"
            },
            {
              "text": "Images, graphics and tables",
              "link": "/en/guides/digging-deeper/pdf/documents-graphics"
            },
            {
              "text": "Navigation, tagging and forms",
              "link": "/en/guides/digging-deeper/pdf/documents-structure"
            },
            {
              "text": "Coming from pdfkit",
              "link": "/en/guides/digging-deeper/pdf/from-pdfkit"
            }
          ],
          "link": "/en/guides/digging-deeper/pdf/"
        },
        {
          "text": "Protobuf and gRPC",
          "link": "/en/guides/digging-deeper/grpc"
        },
        {
          "text": "Decimals and money",
          "link": "/en/guides/digging-deeper/decimals"
        },
        {
          "text": "Dates and recurrence",
          "link": "/en/guides/digging-deeper/dates"
        },
        {
          "text": "Admin panel",
          "collapsed": true,
          "items": [
            {
              "text": "Authorization and writes",
              "link": "/en/guides/digging-deeper/admin/authorization"
            },
            {
              "text": "Sign-in, CSRF and audit",
              "link": "/en/guides/digging-deeper/admin/sign-in"
            }
          ],
          "link": "/en/guides/digging-deeper/admin/"
        },
        {
          "text": "AI agents (MCP)",
          "link": "/en/guides/digging-deeper/mcp"
        }
      ]
    },
    {
      "text": "Command line",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/en/guides/command-line/introduction"
        },
        {
          "text": "Creating commands",
          "link": "/en/guides/command-line/creating-commands"
        },
        {
          "text": "Prompts",
          "link": "/en/guides/command-line/prompts"
        },
        {
          "text": "Terminal UI",
          "link": "/en/guides/command-line/terminal-ui"
        },
        {
          "text": "Terminal output",
          "link": "/en/guides/command-line/terminal-output"
        },
        {
          "text": "Running commands",
          "link": "/en/guides/command-line/running-commands"
        },
        {
          "text": "Generators",
          "link": "/en/guides/command-line/generators"
        },
        {
          "text": "Development server",
          "link": "/en/guides/command-line/dev-server"
        },
        {
          "text": "Database commands",
          "link": "/en/guides/command-line/database"
        },
        {
          "text": "Running and testing",
          "link": "/en/guides/command-line/running-and-testing"
        },
        {
          "text": "Keys and integrations",
          "link": "/en/guides/command-line/keys"
        }
      ]
    },
    {
      "text": "Testing",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/en/guides/testing/introduction"
        },
        {
          "text": "HTTP tests",
          "link": "/en/guides/testing/http-tests"
        },
        {
          "text": "The test runner",
          "link": "/en/guides/testing/runner"
        },
        {
          "text": "Test doubles and time",
          "link": "/en/guides/testing/test-doubles"
        },
        {
          "text": "Authenticating a test client",
          "link": "/en/guides/testing/auth"
        }
      ]
    }
  ],
  "/en/reference/": [
    {
      "text": "Reference",
      "items": [
        {
          "text": "Errors",
          "link": "/en/reference/errors"
        },
        {
          "text": "atlas",
          "link": "/en/reference/atlas"
        },
        {
          "text": "inker",
          "link": "/en/reference/inker"
        },
        {
          "text": "photon",
          "link": "/en/reference/photon"
        },
        {
          "text": "sigil",
          "link": "/en/reference/sigil"
        },
        {
          "text": "spectrum",
          "link": "/en/reference/spectrum"
        },
        {
          "text": "warden",
          "link": "/en/reference/warden"
        },
        {
          "text": "ream-cli",
          "link": "/en/reference/ream-cli"
        }
      ]
    },
    {
      "text": "Components",
      "items": [
        {
          "text": "nebula",
          "link": "/en/nebula/"
        }
      ]
    }
  ]
}

export const nav_fr = [
  {
    "text": "Démarrer",
    "link": "/fr/start/introduction",
    "activeMatch": "^/fr/start/"
  },
  {
    "text": "Guides",
    "link": "/fr/guides/basics/routing",
    "activeMatch": "^/fr/guides/"
  },
  {
    "text": "Référence",
    "link": "/fr/reference/errors",
    "activeMatch": "^/fr/(reference|nebula)/"
  }
]

export const sidebar_fr = {
  "/fr/start/": [
    {
      "text": "Démarrer",
      "items": [
        {
          "text": "Introduction",
          "link": "/fr/start/introduction"
        },
        {
          "text": "Installation",
          "link": "/fr/start/installation"
        },
        {
          "text": "Tutoriel",
          "link": "/fr/start/tutorial"
        },
        {
          "text": "Structure des dossiers",
          "link": "/fr/start/folder-structure"
        },
        {
          "text": "Configuration",
          "link": "/fr/start/configuration"
        },
        {
          "text": "Les paquets",
          "link": "/fr/start/packages"
        },
        {
          "text": "Venir d’AdonisJS",
          "link": "/fr/start/coming-from-adonisjs"
        }
      ]
    }
  ],
  "/fr/guides/": [
    {
      "text": "Bases",
      "collapsed": false,
      "items": [
        {
          "text": "Routage",
          "link": "/fr/guides/basics/routing"
        },
        {
          "text": "Contrôleurs",
          "link": "/fr/guides/basics/controllers"
        },
        {
          "text": "Contexte HTTP",
          "link": "/fr/guides/basics/http-context"
        },
        {
          "text": "Middlewares",
          "link": "/fr/guides/basics/middleware"
        },
        {
          "text": "Requête",
          "link": "/fr/guides/basics/request"
        },
        {
          "text": "Réponse",
          "link": "/fr/guides/basics/response"
        },
        {
          "text": "Parseur de corps",
          "link": "/fr/guides/basics/body-parser"
        },
        {
          "text": "Validation",
          "collapsed": true,
          "items": [
            {
              "text": "Règles",
              "link": "/fr/guides/basics/validation/rules"
            },
            {
              "text": "Règles personnalisées",
              "link": "/fr/guides/basics/validation/custom-rules"
            },
            {
              "text": "Messages d’erreur et i18n",
              "link": "/fr/guides/basics/validation/messages"
            },
            {
              "text": "Validation asynchrone",
              "link": "/fr/guides/basics/validation/async"
            },
            {
              "text": "JSON Schema",
              "link": "/fr/guides/basics/validation/json-schema"
            }
          ],
          "link": "/fr/guides/basics/validation/"
        },
        {
          "text": "Envoi de fichiers",
          "link": "/fr/guides/basics/file-uploads"
        },
        {
          "text": "Construction d’URL et URL signées",
          "link": "/fr/guides/basics/url-builder"
        },
        {
          "text": "Gestion des exceptions",
          "link": "/fr/guides/basics/exception-handling"
        },
        {
          "text": "Fichiers statiques",
          "link": "/fr/guides/basics/static-files"
        }
      ]
    },
    {
      "text": "API",
      "collapsed": false,
      "items": [
        {
          "text": "JSON-RPC",
          "link": "/fr/guides/apis/json-rpc"
        },
        {
          "text": "Clients JSON-RPC",
          "link": "/fr/guides/apis/json-rpc-clients"
        },
        {
          "text": "GraphQL",
          "link": "/fr/guides/apis/graphql"
        },
        {
          "text": "OpenAPI",
          "link": "/fr/guides/apis/openapi"
        },
        {
          "text": "Ressources d’API",
          "link": "/fr/guides/apis/resources"
        }
      ]
    },
    {
      "text": "Frontend",
      "collapsed": false,
      "items": [
        {
          "text": "Templates",
          "collapsed": true,
          "items": [
            {
              "text": "Layouts et composants",
              "link": "/fr/guides/frontend/templates/layouts"
            },
            {
              "text": "Helpers et tags personnalisés",
              "link": "/fr/guides/frontend/templates/extending"
            }
          ],
          "link": "/fr/guides/frontend/templates/"
        },
        {
          "text": "Aurora",
          "collapsed": true,
          "items": [
            {
              "text": "Templates",
              "link": "/fr/guides/frontend/aurora/templates"
            },
            {
              "text": "Signaux",
              "link": "/fr/guides/frontend/aurora/signals"
            },
            {
              "text": "Rendu serveur",
              "link": "/fr/guides/frontend/aurora/server-rendering"
            },
            {
              "text": "Pages partagées",
              "link": "/fr/guides/frontend/aurora/shared-pages"
            },
            {
              "text": "Outils du navigateur",
              "link": "/fr/guides/frontend/aurora/browser"
            },
            {
              "text": "Formulaires et actions",
              "link": "/fr/guides/frontend/aurora/forms"
            },
            {
              "text": "Composants live",
              "link": "/fr/guides/frontend/aurora/live"
            }
          ],
          "link": "/fr/guides/frontend/aurora/"
        },
        {
          "text": "Pages pilotées par le serveur",
          "collapsed": true,
          "items": [
            {
              "text": "Pages et props",
              "link": "/fr/guides/frontend/photon/pages"
            },
            {
              "text": "Frameworks",
              "link": "/fr/guides/frontend/photon/frameworks"
            },
            {
              "text": "Hydratation et navigation",
              "link": "/fr/guides/frontend/photon/hydration"
            },
            {
              "text": "Head, SEO et CSP",
              "link": "/fr/guides/frontend/photon/head"
            }
          ],
          "link": "/fr/guides/frontend/photon/"
        },
        {
          "text": "Vite",
          "link": "/fr/guides/frontend/vite"
        },
        {
          "text": "Tailwind CSS",
          "link": "/fr/guides/frontend/tailwind"
        },
        {
          "text": "Données structurées",
          "link": "/fr/guides/frontend/structured-data"
        },
        {
          "text": "Composants (nebula)",
          "link": "/fr/nebula/"
        }
      ]
    },
    {
      "text": "Couche de données",
      "collapsed": false,
      "items": [
        {
          "text": "ORM SQL",
          "collapsed": true,
          "items": [
            {
              "text": "Premiers pas",
              "link": "/fr/guides/database/orm/getting-started"
            },
            {
              "text": "Entités",
              "link": "/fr/guides/database/orm/entities"
            },
            {
              "text": "Active record",
              "link": "/fr/guides/database/orm/active-record"
            },
            {
              "text": "Relations",
              "link": "/fr/guides/database/orm/relations"
            },
            {
              "text": "Query builder",
              "link": "/fr/guides/database/orm/query-builder"
            },
            {
              "text": "Requêtes avancées",
              "link": "/fr/guides/database/orm/advanced-queries"
            },
            {
              "text": "Pagination et lectures",
              "link": "/fr/guides/database/orm/pagination-and-reads"
            },
            {
              "text": "Transactions et verrous",
              "link": "/fr/guides/database/orm/transactions-and-locks"
            },
            {
              "text": "Repositories",
              "link": "/fr/guides/database/orm/repositories"
            },
            {
              "text": "Hooks de cycle de vie",
              "link": "/fr/guides/database/orm/lifecycle-hooks"
            },
            {
              "text": "Migrations",
              "link": "/fr/guides/database/orm/migrations"
            },
            {
              "text": "Écrire une migration",
              "link": "/fr/guides/database/orm/writing-migrations"
            },
            {
              "text": "Schema builder",
              "link": "/fr/guides/database/orm/schema-builder"
            },
            {
              "text": "Colonnes et index",
              "link": "/fr/guides/database/orm/columns-and-indexes"
            },
            {
              "text": "Contraintes",
              "link": "/fr/guides/database/orm/constraints"
            },
            {
              "text": "Dump et vérification du schéma",
              "link": "/fr/guides/database/orm/schema-dump"
            },
            {
              "text": "Seeders",
              "link": "/fr/guides/database/orm/seeders"
            },
            {
              "text": "Factories",
              "link": "/fr/guides/database/orm/factories"
            },
            {
              "text": "Connexions",
              "link": "/fr/guides/database/orm/connections"
            },
            {
              "text": "Dialectes",
              "link": "/fr/guides/database/orm/dialects"
            },
            {
              "text": "Provider et démarrage",
              "link": "/fr/guides/database/orm/provider"
            },
            {
              "text": "Événements de domaine",
              "link": "/fr/guides/database/orm/domain-events"
            },
            {
              "text": "Sécurité SQL",
              "link": "/fr/guides/database/orm/security"
            },
            {
              "text": "Performance",
              "link": "/fr/guides/database/orm/performance"
            },
            {
              "text": "Observabilité",
              "link": "/fr/guides/database/orm/observability"
            },
            {
              "text": "Gestion des erreurs",
              "link": "/fr/guides/database/orm/error-handling"
            },
            {
              "text": "Recettes",
              "link": "/fr/guides/database/orm/recipes"
            },
            {
              "text": "Dépannage",
              "link": "/fr/guides/database/orm/troubleshooting"
            }
          ],
          "link": "/fr/guides/database/orm/"
        },
        {
          "text": "Redis",
          "link": "/fr/guides/database/redis"
        },
        {
          "text": "Séries temporelles",
          "collapsed": true,
          "items": [
            {
              "text": "Schéma et migrations",
              "link": "/fr/guides/database/time-series/schema"
            },
            {
              "text": "Écrire et lire",
              "link": "/fr/guides/database/time-series/data"
            },
            {
              "text": "Tests",
              "link": "/fr/guides/database/time-series/testing"
            }
          ],
          "link": "/fr/guides/database/time-series/"
        }
      ]
    },
    {
      "text": "Authentification",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/fr/guides/auth/introduction"
        },
        {
          "text": "Vérifier des identifiants",
          "link": "/fr/guides/auth/verifying-credentials"
        },
        {
          "text": "Garde de session",
          "link": "/fr/guides/auth/session-guard"
        },
        {
          "text": "Garde par jetons d’accès",
          "link": "/fr/guides/auth/access-tokens-guard"
        },
        {
          "text": "Garde JWT",
          "link": "/fr/guides/auth/jwt-guard"
        },
        {
          "text": "Garde Basic auth",
          "link": "/fr/guides/auth/basic-auth-guard"
        },
        {
          "text": "Garde personnalisée",
          "link": "/fr/guides/auth/custom-guard"
        },
        {
          "text": "Protéger les routes",
          "link": "/fr/guides/auth/protecting-routes"
        },
        {
          "text": "Authentification multifacteur",
          "link": "/fr/guides/auth/mfa"
        },
        {
          "text": "Autorisation",
          "collapsed": true,
          "items": [
            {
              "text": "Droits (RBAC et ACL)",
              "link": "/fr/guides/auth/authorization/rights"
            },
            {
              "text": "Évaluer les capacités",
              "link": "/fr/guides/auth/authorization/bouncer"
            }
          ],
          "link": "/fr/guides/auth/authorization/"
        },
        {
          "text": "Authentification sociale",
          "collapsed": true,
          "items": [
            {
              "text": "Fournisseurs",
              "link": "/fr/guides/auth/social/providers"
            },
            {
              "text": "OpenID Connect",
              "link": "/fr/guides/auth/social/oidc"
            },
            {
              "text": "SAML 2.0",
              "link": "/fr/guides/auth/social/saml"
            },
            {
              "text": "LDAP et Active Directory",
              "link": "/fr/guides/auth/social/ldap"
            },
            {
              "text": "Tests et drivers personnalisés",
              "link": "/fr/guides/auth/social/testing"
            }
          ],
          "link": "/fr/guides/auth/social/"
        }
      ]
    },
    {
      "text": "Serveur OAuth",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/fr/guides/oauth-server/introduction"
        },
        {
          "text": "Endpoint d’autorisation et clients",
          "link": "/fr/guides/oauth-server/authorize"
        },
        {
          "text": "Protéger des ressources",
          "link": "/fr/guides/oauth-server/resources"
        },
        {
          "text": "Émetteur et stockage",
          "link": "/fr/guides/oauth-server/issuer-and-store"
        },
        {
          "text": "Tests",
          "link": "/fr/guides/oauth-server/testing"
        }
      ]
    },
    {
      "text": "Sécurité",
      "collapsed": false,
      "items": [
        {
          "text": "Hachage",
          "link": "/fr/guides/security/hashing"
        },
        {
          "text": "Chiffrement",
          "link": "/fr/guides/security/encryption"
        },
        {
          "text": "CORS",
          "link": "/fr/guides/security/cors"
        },
        {
          "text": "Sécuriser une app rendue côté serveur",
          "link": "/fr/guides/security/securing-ssr"
        },
        {
          "text": "Protection CSRF",
          "link": "/fr/guides/security/csrf"
        },
        {
          "text": "Assainissement XSS",
          "link": "/fr/guides/security/xss"
        },
        {
          "text": "Limitation de débit",
          "link": "/fr/guides/security/rate-limiting"
        },
        {
          "text": "Checklist de production",
          "link": "/fr/guides/security/production"
        }
      ]
    },
    {
      "text": "Temps réel",
      "collapsed": false,
      "items": [
        {
          "text": "WebSockets",
          "link": "/fr/guides/realtime/websockets"
        },
        {
          "text": "Diffusion",
          "link": "/fr/guides/realtime/broadcasting"
        },
        {
          "text": "Hubs",
          "link": "/fr/guides/realtime/hubs"
        }
      ]
    },
    {
      "text": "Mobile",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/fr/guides/mobile/introduction"
        },
        {
          "text": "Styles et écrans",
          "link": "/fr/guides/mobile/styles-and-screens"
        },
        {
          "text": "Pages pilotées par le serveur",
          "link": "/fr/guides/mobile/server-driven"
        },
        {
          "text": "API de l’appareil",
          "link": "/fr/guides/mobile/device-apis"
        },
        {
          "text": "Gestes et mouvement",
          "link": "/fr/guides/mobile/gestures-and-motion"
        },
        {
          "text": "Construire l’app",
          "link": "/fr/guides/mobile/building"
        }
      ]
    },
    {
      "text": "Concepts clés",
      "collapsed": false,
      "items": [
        {
          "text": "Application",
          "link": "/fr/guides/concepts/application"
        },
        {
          "text": "Cycle de vie de l’application",
          "link": "/fr/guides/concepts/lifecycle"
        },
        {
          "text": "Injection de dépendances",
          "link": "/fr/guides/concepts/dependency-injection"
        },
        {
          "text": "Providers",
          "link": "/fr/guides/concepts/providers"
        },
        {
          "text": "Étendre ream",
          "link": "/fr/guides/concepts/extending"
        },
        {
          "text": "L’API Codemods",
          "link": "/fr/guides/concepts/codemods"
        },
        {
          "text": "Un exemple complet",
          "link": "/fr/guides/concepts/plugin-example"
        },
        {
          "text": "Publier des paquets",
          "link": "/fr/guides/concepts/publishing"
        }
      ]
    },
    {
      "text": "Pour aller plus loin",
      "collapsed": false,
      "items": [
        {
          "text": "Cache",
          "link": "/fr/guides/digging-deeper/cache"
        },
        {
          "text": "Drive",
          "link": "/fr/guides/digging-deeper/drive"
        },
        {
          "text": "Émetteur",
          "link": "/fr/guides/digging-deeper/emitter"
        },
        {
          "text": "Health checks",
          "link": "/fr/guides/digging-deeper/health-checks"
        },
        {
          "text": "Client HTTP",
          "link": "/fr/guides/digging-deeper/http-client"
        },
        {
          "text": "I18n",
          "link": "/fr/guides/digging-deeper/i18n"
        },
        {
          "text": "Verrous atomiques",
          "link": "/fr/guides/digging-deeper/locks"
        },
        {
          "text": "Logger",
          "collapsed": true,
          "items": [
            {
              "text": "Canaux et transports",
              "link": "/fr/guides/digging-deeper/logger/channels"
            },
            {
              "text": "Configuration",
              "link": "/fr/guides/digging-deeper/logger/configuration"
            }
          ],
          "link": "/fr/guides/digging-deeper/logger/"
        },
        {
          "text": "E-mail",
          "collapsed": true,
          "items": [
            {
              "text": "Messages",
              "link": "/fr/guides/digging-deeper/mail/messages"
            },
            {
              "text": "Transports",
              "link": "/fr/guides/digging-deeper/mail/transports"
            },
            {
              "text": "Files et événements",
              "link": "/fr/guides/digging-deeper/mail/queues-and-events"
            }
          ],
          "link": "/fr/guides/digging-deeper/mail/"
        },
        {
          "text": "Files de tâches",
          "link": "/fr/guides/digging-deeper/queues"
        },
        {
          "text": "Planification",
          "link": "/fr/guides/digging-deeper/scheduling"
        },
        {
          "text": "Notifications push",
          "collapsed": true,
          "items": [
            {
              "text": "S’abonner et envoyer",
              "link": "/fr/guides/digging-deeper/push/sending"
            },
            {
              "text": "Service worker",
              "link": "/fr/guides/digging-deeper/push/service-worker"
            },
            {
              "text": "Stockage et tests",
              "link": "/fr/guides/digging-deeper/push/stores-and-testing"
            }
          ],
          "link": "/fr/guides/digging-deeper/push/"
        },
        {
          "text": "Métriques et OpenTelemetry",
          "link": "/fr/guides/digging-deeper/metrics"
        },
        {
          "text": "Images",
          "collapsed": true,
          "items": [
            {
              "text": "QR codes",
              "link": "/fr/guides/digging-deeper/images/qr-codes"
            },
            {
              "text": "Servir des images",
              "link": "/fr/guides/digging-deeper/images/serving"
            },
            {
              "text": "Formats et couleur",
              "link": "/fr/guides/digging-deeper/images/formats"
            },
            {
              "text": "Sécurité et tests",
              "link": "/fr/guides/digging-deeper/images/safety"
            }
          ],
          "link": "/fr/guides/digging-deeper/images/"
        },
        {
          "text": "PDF",
          "collapsed": true,
          "items": [
            {
              "text": "Lire et modifier",
              "link": "/fr/guides/digging-deeper/pdf/editing"
            },
            {
              "text": "Formulaires",
              "link": "/fr/guides/digging-deeper/pdf/forms"
            },
            {
              "text": "Signature",
              "link": "/fr/guides/digging-deeper/pdf/signing"
            },
            {
              "text": "Générer des documents",
              "link": "/fr/guides/digging-deeper/pdf/documents"
            },
            {
              "text": "Texte et polices",
              "link": "/fr/guides/digging-deeper/pdf/documents-text"
            },
            {
              "text": "Images, graphiques et tableaux",
              "link": "/fr/guides/digging-deeper/pdf/documents-graphics"
            },
            {
              "text": "Navigation, balisage et formulaires",
              "link": "/fr/guides/digging-deeper/pdf/documents-structure"
            },
            {
              "text": "Venir de pdfkit",
              "link": "/fr/guides/digging-deeper/pdf/from-pdfkit"
            }
          ],
          "link": "/fr/guides/digging-deeper/pdf/"
        },
        {
          "text": "Protobuf et gRPC",
          "link": "/fr/guides/digging-deeper/grpc"
        },
        {
          "text": "Décimaux et montants",
          "link": "/fr/guides/digging-deeper/decimals"
        },
        {
          "text": "Dates et récurrence",
          "link": "/fr/guides/digging-deeper/dates"
        },
        {
          "text": "Panneau d'administration",
          "collapsed": true,
          "items": [
            {
              "text": "Autorisation et écritures",
              "link": "/fr/guides/digging-deeper/admin/authorization"
            },
            {
              "text": "Connexion, CSRF et audit",
              "link": "/fr/guides/digging-deeper/admin/sign-in"
            }
          ],
          "link": "/fr/guides/digging-deeper/admin/"
        },
        {
          "text": "Agents IA (MCP)",
          "link": "/fr/guides/digging-deeper/mcp"
        }
      ]
    },
    {
      "text": "Ligne de commande",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/fr/guides/command-line/introduction"
        },
        {
          "text": "Créer des commandes",
          "link": "/fr/guides/command-line/creating-commands"
        },
        {
          "text": "Questions",
          "link": "/fr/guides/command-line/prompts"
        },
        {
          "text": "Interface terminal",
          "link": "/fr/guides/command-line/terminal-ui"
        },
        {
          "text": "Sortie terminal",
          "link": "/fr/guides/command-line/terminal-output"
        },
        {
          "text": "Exécuter des commandes",
          "link": "/fr/guides/command-line/running-commands"
        },
        {
          "text": "Générateurs",
          "link": "/fr/guides/command-line/generators"
        },
        {
          "text": "Serveur de développement",
          "link": "/fr/guides/command-line/dev-server"
        },
        {
          "text": "Commandes de base de données",
          "link": "/fr/guides/command-line/database"
        },
        {
          "text": "Lancer et tester",
          "link": "/fr/guides/command-line/running-and-testing"
        },
        {
          "text": "Clés et intégrations",
          "link": "/fr/guides/command-line/keys"
        }
      ]
    },
    {
      "text": "Tests",
      "collapsed": false,
      "items": [
        {
          "text": "Introduction",
          "link": "/fr/guides/testing/introduction"
        },
        {
          "text": "Tests HTTP",
          "link": "/fr/guides/testing/http-tests"
        },
        {
          "text": "Le lanceur de tests",
          "link": "/fr/guides/testing/runner"
        },
        {
          "text": "Doublures et temps",
          "link": "/fr/guides/testing/test-doubles"
        },
        {
          "text": "Authentifier un client de test",
          "link": "/fr/guides/testing/auth"
        }
      ]
    }
  ],
  "/fr/reference/": [
    {
      "text": "Référence",
      "items": [
        {
          "text": "Erreurs",
          "link": "/fr/reference/errors"
        },
        {
          "text": "atlas",
          "link": "/fr/reference/atlas"
        },
        {
          "text": "inker",
          "link": "/fr/reference/inker"
        },
        {
          "text": "photon",
          "link": "/fr/reference/photon"
        },
        {
          "text": "sigil",
          "link": "/fr/reference/sigil"
        },
        {
          "text": "spectrum",
          "link": "/fr/reference/spectrum"
        },
        {
          "text": "warden",
          "link": "/fr/reference/warden"
        },
        {
          "text": "ream-cli",
          "link": "/fr/reference/ream-cli"
        }
      ]
    },
    {
      "text": "Composants",
      "items": [
        {
          "text": "nebula",
          "link": "/fr/nebula/"
        }
      ]
    }
  ]
}
