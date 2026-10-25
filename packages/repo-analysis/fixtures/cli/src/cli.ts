#!/usr/bin/env node
import { format } from './format'

const [, , input] = process.argv
process.stdout.write(`${format(input)}\n`)
