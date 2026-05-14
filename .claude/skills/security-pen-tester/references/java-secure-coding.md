# Oracle Java Secure Coding Guidelines

This reference is loaded by the `security-pen-tester` skill when performing security analysis
on Java code. Guidelines are drawn from Oracle's official Secure Coding Guidelines for Java SE.

**Source:** https://www.oracle.com/java/technologies/javase/seccodeguide.html
**Version:** 11.0 | **Last Updated:** June 2025

---

## Table of Contents

1. [Section 0: Fundamentals](#section-0-fundamentals)
2. [Section 1: Denial of Service](#section-1-denial-of-service)
3. [Section 2: Confidential Information](#section-2-confidential-information)
4. [Section 3: Injection and Inclusion](#section-3-injection-and-inclusion)
5. [Section 4: Accessibility and Extensibility](#section-4-accessibility-and-extensibility)
6. [Section 5: Input Validation](#section-5-input-validation)
7. [Section 6: Mutability](#section-6-mutability)
8. [Section 7: Object Construction](#section-7-object-construction)
9. [Section 8: Serialization and Deserialization](#section-8-serialization-and-deserialization)
10. [Section 9: Access Control](#section-9-access-control)
11. [Appendix A: JNI Guidelines](#appendix-a-jni-guidelines)

---

## Section 0: Fundamentals

### 0-0: Favor Obviously Flawless Code
Design and implement applications without requiring complex logic to verify security. Adhere strictly to established guidelines unless compelling reasons exist otherwise.

### 0-1: Security by Design
Incorporate security considerations during initial API design rather than retrofitting later, such as declaring classes final to prevent unsafe subclassing.

### 0-2: Eliminate Duplication
Prevent inconsistent treatment of code and data by avoiding unnecessary duplication across the codebase.

### 0-3: Principle of Least Privilege
Restrict code permissions to the minimum necessary for functionality. Leverage OS-level isolation and separate JVM processes for untrusted code rather than relying solely on Java's deprecated security manager.

### 0-4: Establish Trust Boundaries
Identify system boundaries and sanitize data crossing them. Document which components require auditing and verify code integrity for boundary enforcement.

### 0-5: Minimize Security Checks
Implement checks at defined points and return capability objects rather than repeatedly validating. Prevent capability leakage to unauthorized code.

### 0-6: Encapsulation
Provide succinct, coherent interfaces. Keep fields private and avoid unnecessary accessors.

### 0-7: Document Security Information
Include security-related details in API documentation: required permissions, exceptions, caller sensitivity, and preconditions/postconditions.

### 0-8: Secure Third-Party Code
Monitor and promptly apply security updates for dependencies. Understand security models, identify secure configurations, and review past vulnerabilities of third-party libraries.

---

## Section 1: Denial of Service

### 1-1: Guard Against Resource Exhaustion
Monitor for activities consuming disproportionate resources:
- Large vector graphic dimensions (SVG, fonts)
- Integer overflow in size validation
- Zip bombs and highly compressed data
- XML entity expansion attacks
- Hash collision attacks through same-hash-code keys
- Catastrophic regex backtracking
- Malicious deserialization
- Oversized image dimensions

**Example Prevention:**
```java
// Set XML secure processing
XMLConstants.FEATURE_SECURE_PROCESSING
```

### 1-2: Release Resources in All Cases
Always pair acquisition with guaranteed release using try-with-resources or try-finally patterns.

**Correct Pattern:**
```java
try (final OutputStream out = Files.newOutputStream(path)) {
    handler.handle(out);
    out.flush();
}
```

### 1-3: Prevent Integer Overflow in Resource Limits
Rearrange checks to avoid overflow:
```java
if (extra < 0 || current > max - extra) {
    throw new IllegalArgumentException();
}
```

Use `Objects.checkFromIndexSize()` or `Math.addExact()` for bounds checking.

### 1-4: Robust Exception/Error Handling
Distinguish between handling (correcting and proceeding) and propagating exceptions. Implement application-level policies for uncaught exceptions that discard failed work units, log issues, perform cleanup, and continue processing.

### 1-5: Avoid User Input as Hash Keys
Never use untrusted data as HashMap or HashSet keys due to collision attack vulnerability. Use `IdentityHashMap` when possible.

---

## Section 2: Confidential Information

### 2-1: Sanitize Exception Messages
Catch and clean internal exceptions before propagating upstream. Remove sensitive details like file paths and system configuration.

**Risk:** FileNotFoundException reveals file existence; exception types may disclose information.

### 2-2: Don't Log Sensitive Data
Exclude highly sensitive information (SSNs, passwords) from logging. Avoid transmitting such data to log files accessible by administrators.

### 2-3: Clear Sensitive Data From Memory
Zero memory containing sensitive data immediately after use rather than awaiting garbage collection. Balance this against code complexity and ineffectiveness against VM/OS memory copies.

---

## Section 3: Injection and Inclusion

### 3-1: Generate Valid Formatting
Parse and canonicalize before validation. Use well-tested libraries instead of ad-hoc code for XML and unusual formats.

### 3-2: Avoid Dynamic SQL
Use parameterized statements with `PreparedStatement` instead of concatenating user input:

```java
String sql = "SELECT * FROM User WHERE userId = ?";
PreparedStatement stmt = con.prepareStatement(sql);
stmt.setString(1, userId);
```

### 3-3: Sanitize XML/HTML Output
Properly escape or encode untrusted data before inclusion. Use libraries rather than manual implementation.

### 3-4: Restrict Command-Line Untrusted Data
Never place untrusted data on command lines. Pass data via encoded arguments, temporary files, or inherited channels instead.

### 3-5: Restrict XML Inclusion
Disable DTDs, external entities, XInclude, and XSLT document functions. Use restrictive XML parser configuration:

```java
XMLConstants.FEATURE_SECURE_PROCESSING = true
```

### 3-6: Be Cautious With BMP Files
BMP files may reference local ICC color profile files. Avoid BMP processing or reduce privileges.

### 3-7: Disable HTML in Swing Components
Prevent HTML interpretation in Swing components:

```java
label.putClientProperty("html.disable", true);
```

### 3-8: Control Untrusted Code Interpretation
Exercise extreme caution when executing code from untrusted sources through:
- Scripting APIs (javax.script)
- XSLT extensions (disable via FEATURE_SECURE_PROCESSING)
- JavaBeans XML persistence
- Java Sound loading
- RMI/LDAP remote code loading (disabled by default)
- JNDI lookups with strict filter configuration

### 3-9: Prevent Exceptional Floating Point Injection
Validate floating-point inputs for NaN and infinity:

```java
if (Double.isNaN(untrusted_double_value)) { /* handle */ }
if (Double.isInfinite(untrusted_double_value)) { /* handle */ }
```

---

## Section 4: Accessibility and Extensibility

### 4-1: Limit Accessibility
Declare classes/interfaces/members public only if part of published API. Otherwise use package-private or private. Seal packages in JAR manifests.

### 4-2: Use Modules for Encapsulation
Export only published APIs; hide implementation packages. Prevent reflection access to non-exported packages. Open packages selectively for reflective access by trusted modules.

### 4-4: Restrict ClassLoader Exposure
Limit access to ClassLoader instances as they enable:
- Accessing restricted classes
- Retrieving resource URLs
- Modifying assertion status
- Accessing undesirable subclass methods

### 4-5: Declare Classes Final or Sealed
Prevent malicious subclassing. Use sealed classes (Java 15+) to permit only specific subclasses:

```java
public sealed class InetAddress implements Serializable
    permits Inet4Address, Inet6Address { }
```

### 4-6: Understand Superclass Effects
Subclasses cannot control all behavior; superclass changes affect subclass security. Encapsulate rather than extend when security-sensitive.

---

## Section 5: Input Validation

### 5-1: Validate Untrusted Inputs
Check inputs before use. Validate early to reject malformed data quickly, and again before security-sensitive operations. Examples: integer overflow, directory traversal ("../"), ZIP bomb detection.

### 5-2: Validate Upcall Return Values
Validate output from untrusted objects as if it were input. Be aware ClassLoader.loadClass() may return different Class instances across calls.

### 5-3: Wrap Native Methods
Declare native methods private with public Java wrappers that validate inputs:

```java
public final class NativeMethodWrapper {
    private native void nativeOperation(byte[] data,
                                       int offset, int len);
    public void doOperation(byte[] data, int offset, int len) {
        data = data.clone();
        if (offset < 0 || len < 0 || offset > data.length - len) {
            throw new IllegalArgumentException();
        }
        nativeOperation(data, offset, len);
    }
}
```

### 5-4: Verify API Input Validation Behavior
Don't assume APIs perform necessary validation without verifying documentation. Test actual behavior. Account for discrepancies between different implementations parsing similar data (URLs, file paths).

---

## Section 6: Mutability

### 6-1: Prefer Immutability
Make value classes immutable. Hide constructors and provide factory methods. Declare fields final.

### 6-2: Copy Mutable Output
Return clones of internal mutable objects:

```java
public java.util.Date getDate() {
    return (java.util.Date)date.clone();
}
```

### 6-3: Copy Untrusted Mutable Input
Create copies of untrusted mutable inputs before storing:

```java
public CopyMutableInput(Date date) {
    this.date = new Date(date.getTime());
}
```

Perform deep copies for collections containing mutable elements.

### 6-4: Support Copy Functionality
Provide copy constructors or static creation methods for mutable classes. Avoid `Cloneable` due to implementation complexity.

### 6-5: Don't Trust Overrideable Equality
Use `IdentityHashMap` for identity-based lookups, or employ package-private keys.

### 6-6: Treat Input to Untrusted Code as Output
Copy mutable objects before passing to untrusted code.

### 6-7: Treat Untrusted Output as Input
Apply defensive copying and validation to objects returned from untrusted code.

### 6-8: Wrap Internal State Access
Provide getter/setter wrappers for modifiable internal state with validation.

### 6-9: Declare Public Static Fields Final
Public non-final static fields are trivially modifiable without guards.

### 6-10: Ensure Public Static Final Values Are Constants
Store only immutable values in public static fields. Use unmodifiable collections:

```java
public static final List<String> names =
    List.of("Fred", "Jim", "Sheila");
```

### 6-11: Don't Expose Mutable Statics
Treat private mutable statics as public in terms of security risk. Never cache mutable objects.

### 6-12: Don't Expose Modifiable Collections
Return unmodifiable copies or views:

```java
public List<String> getSomethingStateful() {
    return Collections.unmodifiableList(somethingStateful);
}
```

---

## Section 7: Object Construction

### 7-1: Avoid Exposing Constructors
Use static factory methods instead of public constructors. Support extensibility through delegation, not inheritance.

### 7-3: Defend Against Partially Initialized Non-Final Classes
Ensure objects remain unusable until successfully initialized. Use initialized flags or pointer-to-implementation patterns.

### 7-4: Prevent Constructors From Calling Overridable Methods
Overridable method calls may leak `this` before initialization completes, affecting clone, readObject, and readObjectNoData.

### 7-5: Defend Against Cloning
Non-final classes may be unexpectedly cloned by subclasses implementing Cloneable. Use pointer-to-implementation defense.

---

## Section 8: Serialization and Deserialization

**Critical Note:** "Deserialization of untrusted data is inherently dangerous and should be avoided."

### 8-1: Avoid Serializing Security-Sensitive Classes
Serialization creates a public interface to all fields. Don't serialize sensitive classes; avoid unintentional serialization through inheritance.

### 8-2: Guard Sensitive Data During Serialization
Prevent sensitive field access by declaring fields `transient`, using `serialPersistentFields`, implementing `writeObject`, using `writeReplace`, or implementing `Externalizable`.

### 8-3: View Deserialization as Object Construction
Implement `readObject` to perform input validation identical to constructors. Use `ObjectInputStream.readFields()` instead of `defaultReadObject()`:

```java
private void readObject(ObjectInputStream in) throws IOException {
    ObjectInputStream.GetField fields = in.readFields();
    this.data = ((byte[])fields.get("data")).clone();
}
```

Create copies of deserialized mutable objects. Use initialization flags to prevent partially initialized objects from executing methods.

### 8-4: Duplicate Security Checks During Deserialization
Replicate constructor security checks in `readObject`. If methods modify guarded state, enforce identical checks during deserialization.

### 8-6: Filter Untrusted Serial Data
Use Serialization Filtering (JDK 9+) with allow-lists of safe classes:

```java
// Prefer allow-lists over reject-lists
// Configure via system properties or filter factory
```

Use context-specific filters (JDK 17+) for different deserialization contexts.

---

## Section 9: Access Control

**NOTE:** Security Manager deprecated Java 17, permanently disabled Java 24. Use process isolation instead.

### 9-1: Understand Permission Checks
Permission intersection across call stack means any unprivileged frame denies permission, regardless of caller privilege.

### 9-2: Beware of Callback Methods
Callbacks execute with full permissions. Malicious code may bridge callbacks to security-checked operations through object manipulation.

### 9-3: Safely Invoke doPrivileged
Only use hardcoded values with doPrivileged, never caller-provided inputs. Keep privileged sections minimal:

```java
return AccessController.doPrivileged(
    new PrivilegedAction<String>() {
        public String run() {
            return System.getProperty("xx.lib.options");
        }
    }
);
```

### 9-8: Safely Invoke Caller-Sensitive APIs
Methods like `Class.newInstance`, `ClassLoader.getParent`, `Class.getMethod` bypass SecurityManager checks based on immediate caller's class loader. Don't invoke on untrusted ClassLoader instances or using untrusted inputs.

### 9-17: Isolate Unrelated Code
Use separate ClassLoader instances for unrelated code. Prevent mutable statics and exceptions from breaching isolation boundaries.

---

## Appendix A: JNI Guidelines

### JNI-1: Use JNI Only When Necessary
Avoid native code when Java alternatives exist. Keep native code minimal to reduce attack surface.

### JNI-2: Understand C/C++ Threat Model
Native code lacks Java's memory safety, automatic bounds checking, and pointer safety. Expect memory exploits (buffer overflows, heap corruption).

### JNI-3: Native Code Violates Java Isolation
JNI code bypasses Java access controls, visibility rules, and security policies. Protect against native method rebinding by untrusted code.

### JNI-4: Validate Data Before Passing to JNI
Java wrappers must validate parameters before native invocation. Keep native memory references private and read-only from Java.

### JNI-5: Test JNI for Concurrent Access
Apply proper synchronization in multi-threaded scenarios to prevent memory corruption and race conditions.

### JNI-6: Secure Library Loading
Don't invoke loadLibrary on behalf of untrusted code. Avoid privileged blocks for loadLibrary. Inspect RPATH/RUNPATH settings and avoid relative references.

### JNI-7: Revalidate Inputs at Language Boundary
Use `-Xcheck:jni` flag. Native code must validate primitive parameters, especially array indices, for negative values.

### JNI-8: Handle Java Exceptions From JNI
Check for exceptions after Java method calls and JNI API invocations. Use input allow-lists to limit exposure.

### JNI-9: Follow Secure Native Development Practices
Enable OS protections: stack cookies, address space layout randomization, non-executable memory pages. Follow platform-specific secure coding guidelines.

---

## Key Takeaways

1. **Security by Design:** Incorporate security from the beginning, not as an afterthought.
2. **Defense in Depth:** Use multiple protective layers—input validation, bounds checking, encapsulation, isolation.
3. **Process Isolation:** Prefer separate JVM processes over security manager for isolating untrusted code.
4. **Immutability:** Favor immutable designs to prevent mutation-based vulnerabilities.
5. **Explicit Validation:** Always validate untrusted inputs at trust boundaries.
6. **Minimal Privileges:** Grant code only permissions absolutely necessary.
7. **Third-Party Vigilance:** Monitor and promptly patch dependencies.
8. **Avoid Serialization:** Never deserialize untrusted data without robust filtering.

---

## Quick Reference: Common Vulnerabilities

| Vulnerability | Guideline | Prevention |
|--------------|-----------|------------|
| SQL Injection | 3-2 | Use PreparedStatement with parameterized queries |
| XML External Entity (XXE) | 3-5 | Disable DTDs and external entities |
| Command Injection | 3-4 | Never pass untrusted data to command line |
| Deserialization | 8-6 | Use serialization filters, prefer allow-lists |
| Resource Exhaustion | 1-1 | Validate sizes, use timeouts, limit resources |
| Information Disclosure | 2-1, 2-2 | Sanitize exceptions, avoid logging sensitive data |
| Hash Collision DoS | 1-5 | Don't use untrusted input as hash keys |
