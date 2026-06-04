# Application Lifecycle

## Execution order

1. `register`
2. `boot`
3. `start`
4. `ready`
5. `shutdown`

## Practical rules

- `register`: IoC bindings, no heavy IO
- `boot`: DB/bus/cache initialization
- `start`: open HTTP/console runtime
- `ready`: app is serving
- `shutdown`: graceful teardown

## Recommendation

Test shutdown explicitly (SIGTERM/SIGINT) to validate long-lived resource cleanup.
