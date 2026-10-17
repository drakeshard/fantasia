# Content Studio registry lifecycle separation

The only registry lifecycle is:

`WORKING → CANDIDATE → IN REVIEW → APPROVED → FROZEN → RUNTIME READY → PUBLISHED → RETIRED`

Review feedback, validation/readiness, processing-job state, runtime verification, and publication evidence are independent dimensions. They must not be encoded as replacement lifecycle states. An APPROVED version may therefore still carry a blocking runtime-validation result.
