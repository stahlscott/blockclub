import type { Meta, StoryObj } from "@storybook/react";
import { Greeting } from "./Greeting";

const meta: Meta<typeof Greeting> = {
  title: "Components/Greeting",
  component: Greeting,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Displays a time-based greeting (Good morning/afternoon/evening). " +
          "Renders 'Welcome' on server, then updates to time-based greeting on client.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Greeting>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows the greeting based on current local time.",
      },
    },
  },
};
