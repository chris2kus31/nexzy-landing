"use client";

import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { labelProps, inputProps } from "./shared";
import type { PollDraft } from "./usePostEditor";

/**
 * The reader-poll editor (shared chassis, every beat). The writer proposes a
 * question + options; the Editor-in-Chief owns them here. A poll saves only when
 * it has a question and >= 2 options; clear the question to remove the poll.
 */
export default function PollEditor({
  poll,
  setPoll,
}: {
  poll: PollDraft;
  setPoll: (p: PollDraft) => void;
}) {
  const setQuestion = (question: string) => setPoll({ ...poll, question });
  const setOption = (i: number, v: string) => {
    const options = poll.options.slice();
    options[i] = v;
    setPoll({ ...poll, options });
  };
  const addOption = () => {
    if (poll.options.length >= 4) return;
    setPoll({ ...poll, options: [...poll.options, ""] });
  };
  const removeOption = (i: number) =>
    setPoll({ ...poll, options: poll.options.filter((_, j) => j !== i) });

  const options = poll.options.length ? poll.options : ["", ""];

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={1}>
        <Text {...labelProps} mb={0}>
          Reader poll
        </Text>
        <Text fontSize="11px" color="whiteAlpha.500">
          AI-proposed · you own it · needs 2+ options
        </Text>
      </Flex>
      <VStack align="stretch" gap={2}>
        <Input
          value={poll.question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Poll question (leave blank for no poll)"
          {...inputProps}
        />
        {options.map((opt, i) => (
          <HStack key={i} gap={2}>
            <Input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              {...inputProps}
            />
            <Button
              size="sm"
              variant="ghost"
              color="red.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => removeOption(i)}
              aria-label="Remove option"
            >
              ✕
            </Button>
          </HStack>
        ))}
        {poll.options.length < 4 && (
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.lightBlue"
            alignSelf="flex-start"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={addOption}
          >
            + Add option
          </Button>
        )}
      </VStack>
    </Box>
  );
}
