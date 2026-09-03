import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  validateUsername,
  validatePassword,
} from "../src/auth.js";

describe("password hashing", () => {
  it("哈希后可验证正确密码", () => {
    const { hash, salt } = hashPassword("secret123");
    expect(verifyPassword("secret123", salt, hash)).toBe(true);
  });
  it("错误密码验证失败", () => {
    const { hash, salt } = hashPassword("secret123");
    expect(verifyPassword("wrongpw", salt, hash)).toBe(false);
  });
  it("不同盐产生不同哈希", () => {
    const a = hashPassword("secret123");
    const b = hashPassword("secret123");
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("jwt token", () => {
  it("签发后可验证并还原身份", () => {
    const token = signToken(42, "alice");
    const payload = verifyToken(token);
    expect(payload).toEqual({ sub: 42, username: "alice" });
  });
  it("非法 token 返回 null", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});

describe("input validation", () => {
  it("用户名：合法通过", () => {
    expect(validateUsername("alice_1-x")).toBeNull();
    expect(validateUsername("张三")).toBeNull();
  });
  it("用户名：过短/非法字符拒绝", () => {
    expect(validateUsername("a")).not.toBeNull();
    expect(validateUsername("a b!")).not.toBeNull();
  });
  it("密码：过短拒绝，合法通过", () => {
    expect(validatePassword("123")).not.toBeNull();
    expect(validatePassword("secret123")).toBeNull();
  });
});
