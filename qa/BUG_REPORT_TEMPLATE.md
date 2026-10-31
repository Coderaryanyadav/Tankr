# TANKR Bug Report Template

**Bug ID:** `BUG-[ROLE]-[NUMBER]` (e.g., `BUG-CUST-001`, `BUG-SEC-001`)  
**Title:** [Brief, descriptive summary of the defect]  
**Severity:** [P0 - Critical | P1 - High | P2 - Medium | P3 - Low]  
**Priority:** [Urgent | High | Normal | Low]  
**Affected Role:** [Customer | Supplier | Driver | Admin | Cross-Role]  
**Affected Screen / Service:** [Screen name or backend file]  
**Environment:** [Test Environment / Local / Staging]  

---

### 1. Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### 2. Expected Behavior
[What should happen based on specifications and business rules]

### 3. Actual Behavior
[What actually happened, including error logs or response payloads]

### 4. Root Cause Analysis
[Technical cause in code, query, race condition, or state management]

### 5. Affected Files & Line Numbers
- `[path/to/file.ts#L10-L20]`

### 6. Remediation & Fix
[Description of the applied fix]

### 7. Regression Test
- **Test File:** `[path/to/regression.test.ts]`
- **Test Case Name:** `[Name of test confirming the fix]`
- **Retest Result:** [PASS / FAIL with timestamp and run log]
