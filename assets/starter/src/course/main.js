/**
 * main.js · 课件入口：把四块交给引擎
 * 做新课：只改 course.demo.js（或复制一份），这个文件不动。
 */
import { boot } from "../framework/engine.js";
import { C, world, model, consoleCfg } from "./course.demo.js";

boot({ C, world, model, console: consoleCfg });
